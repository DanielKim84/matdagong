package kr.matdagong.community.notification;

import static kr.matdagong.community.notification.NotificationModels.*;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 알림 스냅샷과 사용자별 읽음·삭제 상태를 관리합니다.
 * 알림은 서버 이벤트(맛집 기록 확인, 구독 신청)에서만 만들며, DB에 있는 SYSTEM_NOTICE 종류는 운영 공지용으로 남겨 둔 값입니다.
 */
@Service
public class NotificationService {
    private final JdbcTemplate jdbc;

    public NotificationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public NotificationFeed list(UUID recipientId) {
        deleteExpired();
        List<NotificationView> items = jdbc.query("""
                SELECT notification_id, notification_type, title, message,
                       target_type, target_id, created_at, read_at
                FROM user_notifications
                WHERE recipient_account_id = ? AND expires_at > now()
                ORDER BY created_at DESC, notification_id DESC
                """, notificationRowMapper(), recipientId);
        Integer unreadCount = jdbc.queryForObject("""
                SELECT count(*) FROM user_notifications
                WHERE recipient_account_id = ? AND read_at IS NULL AND expires_at > now()
                """, Integer.class, recipientId);
        return new NotificationFeed(items, unreadCount == null ? 0 : unreadCount);
    }

    /**
     * 확인된 맛집 기록으로 등록 완료 알림과 구독자 알림을 만듭니다.
     * 이벤트 키를 장소 기준으로 서버에서 정해 같은 장소로 반복 호출해도 구독자에게 한 번만 알립니다.
     */
    @Transactional
    public NotificationView placeRegistered(UUID recipientId, PlaceServiceClient.RecordedPlace place) {
        deleteExpired();
        String eventKey = "place-recorded:" + place.placeId();
        jdbc.update("""
                INSERT INTO user_notifications (
                    recipient_account_id, notification_type, title, message,
                    target_type, target_id, event_key
                ) VALUES (?, 'PLACE_RECORD_CREATED', '맛집 등록이 완료됐어요.', ?, 'PLACE', ?, ?)
                ON CONFLICT (recipient_account_id, event_key) WHERE event_key IS NOT NULL DO NOTHING
                """, recipientId, place.placeName().trim() + "의 맛있는 이야기를 확인해 보세요.",
                place.placeId(), eventKey);
        if (place.publicRecord()) {
            String tasterName = jdbc.query(
                    "SELECT nickname FROM user_profiles WHERE account_id = ?",
                    rs -> rs.next() ? rs.getString(1) : "맛객",
                    recipientId);
            List<UUID> subscribers = jdbc.query("""
                    SELECT DISTINCT subscription.subscriber_id
                    FROM user_subscriptions subscription
                    JOIN user_subscription_history period
                      ON period.subscription_id = subscription.subscription_id
                     AND period.period_st = 'ACTIVE'
                    WHERE subscription.target_account_id = ?
                      AND subscription.subscription_st = 'ACTIVE'
                      AND (period.end_dt IS NULL OR period.end_dt > now())
                    """, (rs, row) -> rs.getObject(1, UUID.class), recipientId);
            for (UUID subscriberId : subscribers) {
                jdbc.update("""
                        INSERT INTO user_notifications (
                            recipient_account_id, notification_type, title, message,
                            target_type, target_id, event_key
                        ) VALUES (?, 'TASTER_NEW_PLACE', '구독 중인 맛객이 새 기록을 남겼어요.', ?, 'PLACE', ?, ?)
                        ON CONFLICT (recipient_account_id, event_key) WHERE event_key IS NOT NULL DO NOTHING
                        """, subscriberId, tasterName + " 맛객이 " + place.placeName().trim() + "을(를) 등록했어요.",
                        place.placeId(), eventKey + ":" + subscriberId);
            }
        }
        return jdbc.queryForObject("""
                SELECT notification_id, notification_type, title, message,
                       target_type, target_id, created_at, read_at
                FROM user_notifications
                WHERE recipient_account_id = ? AND event_key = ?
                """, notificationRowMapper(), recipientId, eventKey);
    }

    @Transactional
    public void newSubscriber(UUID recipientId, UUID subscriberId, String subscriberName, UUID eventId) {
        deleteExpired();
        jdbc.update("""
                INSERT INTO user_notifications (
                    recipient_account_id, notification_type, title, message,
                    target_type, target_id, event_key
                ) VALUES (?, 'NEW_SUBSCRIBER', '새 구독자가 생겼어요.', ?, 'MY_SUBSCRIBERS', ?, ?)
                ON CONFLICT (recipient_account_id, event_key) WHERE event_key IS NOT NULL DO NOTHING
                """, recipientId, subscriberName + "님이 당신의 맛집을 구독했어요.",
                subscriberId.toString(), eventId.toString());
    }

    @Transactional
    public void markRead(UUID recipientId, UUID notificationId) {
        jdbc.update("""
                UPDATE user_notifications SET read_at = COALESCE(read_at, now())
                WHERE notification_id = ? AND recipient_account_id = ?
                  AND expires_at > now()
                """, notificationId, recipientId);
    }

    @Transactional
    public void markAllRead(UUID recipientId) {
        jdbc.update("""
                UPDATE user_notifications SET read_at = now()
                WHERE recipient_account_id = ? AND read_at IS NULL
                  AND expires_at > now()
                """, recipientId);
    }

    /** 눌러서 이동할 대상(장소 상세·내 구독자)이 없는 안내성 알림만 읽음 처리합니다. 이동형 알림은 실제로 눌렀을 때 읽음이 됩니다. */
    @Transactional
    public void markPassiveRead(UUID recipientId) {
        jdbc.update("""
                UPDATE user_notifications SET read_at = now()
                WHERE recipient_account_id = ? AND read_at IS NULL
                  AND expires_at > now()
                  AND NOT (target_type = 'PLACE' AND target_id IS NOT NULL)
                  AND target_type IS DISTINCT FROM 'MY_SUBSCRIBERS'
                """, recipientId);
    }

    @Transactional
    public void delete(UUID recipientId, UUID notificationId) {
        jdbc.update("DELETE FROM user_notifications WHERE notification_id = ? AND recipient_account_id = ?",
                notificationId, recipientId);
    }

    @Transactional
    public void deleteAll(UUID recipientId) {
        jdbc.update("DELETE FROM user_notifications WHERE recipient_account_id = ?", recipientId);
    }

    /** 보관 기간이 지난 알림은 매일 새벽 정리하고, 목록 요청에서도 한 번 더 정리합니다. */
    @Scheduled(cron = "0 15 4 * * *", zone = "Asia/Seoul")
    public void deleteExpired() {
        jdbc.update("DELETE FROM user_notifications WHERE expires_at <= now()");
    }

    private RowMapper<NotificationView> notificationRowMapper() {
        return (rs, row) -> new NotificationView(
                rs.getObject("notification_id", UUID.class),
                rs.getString("notification_type"),
                rs.getString("title"),
                rs.getString("message"),
                rs.getString("target_type"),
                rs.getString("target_id"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("read_at") == null ? null : rs.getTimestamp("read_at").toInstant());
    }
}
