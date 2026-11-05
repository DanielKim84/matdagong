package kr.matdagong.community.notification;

import static kr.matdagong.community.notification.NotificationModels.*;

import java.util.List;
import java.util.UUID;
import kr.matdagong.common.jdbc.JdbcTimes;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 알림 스냅샷과 사용자별 읽음·삭제 상태를 관리합니다.
 * 알림은 서버 이벤트(맛집 기록 확인, 구독 신청)에서만 만들며, DB에 있는 SYSTEM_NOTICE 종류는 운영 공지용으로 남겨 둔 값입니다.
 * 받는 사람이 끈 종류(구독 맛객 새 기록·새 구독자)는 만들지 않습니다(user_notification_settings, 행이 없으면 기본값).
 */
@Service
public class NotificationService {
    private static final NotificationSettings DEFAULT_SETTINGS = new NotificationSettings(true, true, false);
    // 알림을 눌렀을 때 이동할 대상 종류(target_type)입니다. 화면이 이 값으로 장소 상세·내 구독자 화면을 엽니다.
    private static final String PLACE_TARGET = "PLACE";
    private static final String MY_SUBSCRIBERS_TARGET = "MY_SUBSCRIBERS";
    /** 기록한 맛객의 프로필을 찾지 못했을 때 구독자 알림에 쓰는 이름입니다. */
    private static final String UNKNOWN_TASTER_NAME = "맛객";

    private static final String NOTIFICATION_COLUMNS =
            "notification_id, notification_type, title, message, target_type, target_id, created_at, read_at";
    private static final RowMapper<NotificationView> NOTIFICATION_MAPPER = (rs, row) -> new NotificationView(
            rs.getObject("notification_id", UUID.class),
            NotificationType.valueOf(rs.getString("notification_type")),
            rs.getString("title"),
            rs.getString("message"),
            rs.getString("target_type"),
            rs.getString("target_id"),
            JdbcTimes.instant(rs, "created_at"),
            JdbcTimes.instant(rs, "read_at"));

    private final JdbcTemplate jdbc;

    public NotificationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 저장한 설정이 없으면 기본값(구독 맛객 새 기록·새 구독자 켬, 소식·이벤트 끔)을 돌려줍니다. */
    @Transactional(readOnly = true)
    public NotificationSettings settings(UUID accountId) {
        return jdbc.query(
                """
                SELECT notify_taster_new_place, notify_new_subscriber, notify_service_news
                FROM user_notification_settings WHERE account_id = ?
                """,
                rs -> rs.next()
                        ? new NotificationSettings(
                                rs.getBoolean("notify_taster_new_place"),
                                rs.getBoolean("notify_new_subscriber"),
                                rs.getBoolean("notify_service_news"))
                        : DEFAULT_SETTINGS,
                accountId);
    }

    @Transactional
    public NotificationSettings updateSettings(UUID accountId, NotificationSettings request) {
        jdbc.update(
                """
                INSERT INTO user_notification_settings (
                    account_id, notify_taster_new_place, notify_new_subscriber, notify_service_news
                ) VALUES (?, ?, ?, ?)
                ON CONFLICT (account_id) DO UPDATE SET
                    notify_taster_new_place = EXCLUDED.notify_taster_new_place,
                    notify_new_subscriber = EXCLUDED.notify_new_subscriber,
                    notify_service_news = EXCLUDED.notify_service_news,
                    upd_dt = now()
                """,
                accountId,
                request.tasterNewPlace(),
                request.newSubscriber(),
                request.serviceNews());
        return settings(accountId);
    }

    /** 보관 기간이 지난 알림은 조건으로 빼고 보여 줍니다. 실제 삭제는 매일 정리 작업과 알림을 만들 때 합니다. */
    @Transactional(readOnly = true)
    public NotificationFeed list(UUID recipientId) {
        List<NotificationView> items = jdbc.query(
                """
                SELECT %s FROM user_notifications
                WHERE recipient_account_id = ? AND expires_at > now()
                ORDER BY created_at DESC, notification_id DESC
                """
                        .formatted(NOTIFICATION_COLUMNS),
                NOTIFICATION_MAPPER,
                recipientId);
        Integer unreadCount = jdbc.queryForObject(
                """
                SELECT count(*) FROM user_notifications
                WHERE recipient_account_id = ? AND read_at IS NULL AND expires_at > now()
                """,
                Integer.class,
                recipientId);
        return new NotificationFeed(items, unreadCount == null ? 0 : unreadCount);
    }

    /**
     * 확인된 맛집 기록으로 등록 완료 알림과 구독자 알림을 만듭니다.
     * 이벤트 키를 장소 기준으로 서버에서 정해 같은 장소로 반복 호출해도 구독자에게 한 번만 알립니다.
     * 보관 기간이 지난 같은 이벤트 키의 알림이 새 알림을 막지 않도록 먼저 지웁니다.
     */
    @Transactional
    public NotificationView placeRegistered(UUID recipientId, PlaceServiceClient.RecordedPlace place) {
        deleteExpired();
        String eventKey = "place-recorded:" + place.placeId();
        String placeName = place.placeName().trim();
        insert(
                recipientId,
                NotificationType.PLACE_RECORD_CREATED,
                "맛집 등록이 완료됐어요.",
                placeName + "의 맛있는 이야기를 확인해 보세요.",
                PLACE_TARGET,
                place.placeId(),
                eventKey);
        if (place.publicRecord()) {
            String tasterName = jdbc.query(
                    "SELECT nickname FROM user_profiles WHERE account_id = ?",
                    rs -> rs.next() ? rs.getString(1) : UNKNOWN_TASTER_NAME,
                    recipientId);
            for (UUID subscriberId : subscribersToNotify(recipientId)) {
                insert(
                        subscriberId,
                        NotificationType.TASTER_NEW_PLACE,
                        "구독 중인 맛객이 새 기록을 남겼어요.",
                        tasterName + " 맛객이 " + placeName + "을(를) 등록했어요.",
                        PLACE_TARGET,
                        place.placeId(),
                        eventKey + ":" + subscriberId);
            }
        }
        return jdbc.queryForObject(
                """
                SELECT %s FROM user_notifications
                WHERE recipient_account_id = ? AND event_key = ?
                """
                        .formatted(NOTIFICATION_COLUMNS),
                NOTIFICATION_MAPPER,
                recipientId,
                eventKey);
    }

    /**
     * 신고가 쌓여 자동으로 가려졌다고 본인에게 알립니다. 운영 안내라 알림 설정과 관계없이 보내고,
     * eventKey(가린 시각)로 같은 가림의 알림은 한 번만 만듭니다.
     */
    @Transactional
    public void hiddenByReports(UUID recipientId, String eventKey) {
        deleteExpired();
        insert(
                recipientId,
                NotificationType.SYSTEM_NOTICE,
                "신고가 쌓여 내 프로필이 임시로 가려졌어요.",
                "다른 맛객에게 내 프로필과 기록이 보이지 않고, 새 기록을 남길 수 없어요. 운영팀이 확인한 뒤 다시 알려 드릴게요.",
                null,
                null,
                eventKey);
    }

    /** 받는 사람이 새 구독자 알림을 껐으면 만들지 않습니다. eventId(구독 회차 ID)로 같은 회차의 알림은 한 번만 만듭니다. */
    @Transactional
    public void newSubscriber(UUID recipientId, UUID subscriberId, String subscriberName, UUID eventId) {
        deleteExpired();
        if (!settings(recipientId).newSubscriber()) return;
        insert(
                recipientId,
                NotificationType.NEW_SUBSCRIBER,
                "새 구독자가 생겼어요.",
                subscriberName + "님이 당신의 맛집을 구독했어요.",
                MY_SUBSCRIBERS_TARGET,
                subscriberId.toString(),
                eventId.toString());
    }

    @Transactional
    public void markRead(UUID recipientId, UUID notificationId) {
        jdbc.update(
                """
                UPDATE user_notifications SET read_at = COALESCE(read_at, now())
                WHERE notification_id = ? AND recipient_account_id = ?
                  AND expires_at > now()
                """,
                notificationId,
                recipientId);
    }

    @Transactional
    public void markAllRead(UUID recipientId) {
        jdbc.update(
                """
                UPDATE user_notifications SET read_at = now()
                WHERE recipient_account_id = ? AND read_at IS NULL
                  AND expires_at > now()
                """,
                recipientId);
    }

    /** 눌러서 이동할 대상(장소 상세·내 구독자)이 없는 안내성 알림만 읽음 처리합니다. 이동형 알림은 실제로 눌렀을 때 읽음이 됩니다. */
    @Transactional
    public void markPassiveRead(UUID recipientId) {
        jdbc.update(
                """
                UPDATE user_notifications SET read_at = now()
                WHERE recipient_account_id = ? AND read_at IS NULL
                  AND expires_at > now()
                  AND NOT (target_type = 'PLACE' AND target_id IS NOT NULL)
                  AND target_type IS DISTINCT FROM 'MY_SUBSCRIBERS'
                """,
                recipientId);
    }

    @Transactional
    public void delete(UUID recipientId, UUID notificationId) {
        jdbc.update(
                "DELETE FROM user_notifications WHERE notification_id = ? AND recipient_account_id = ?",
                notificationId,
                recipientId);
    }

    @Transactional
    public void deleteAll(UUID recipientId) {
        jdbc.update("DELETE FROM user_notifications WHERE recipient_account_id = ?", recipientId);
    }

    /** 보관 기간이 지난 알림은 매일 새벽 정리하고, 새 알림을 만들 때도 한 번 더 정리합니다. */
    @Scheduled(cron = "0 15 4 * * *", zone = "Asia/Seoul")
    @Transactional
    public void deleteExpired() {
        jdbc.update("DELETE FROM user_notifications WHERE expires_at <= now()");
    }

    /** 이 맛객을 지금 이용 중인 회차로 구독하고, 구독 맛객 새 기록 알림을 끄지 않은 사용자입니다. */
    private List<UUID> subscribersToNotify(UUID tasterId) {
        return jdbc.query(
                """
                SELECT DISTINCT subscription.subscriber_id
                FROM user_subscriptions subscription
                JOIN user_subscription_history period
                  ON period.subscription_id = subscription.subscription_id
                 AND period.period_st = 'ACTIVE'
                LEFT JOIN user_notification_settings setting
                  ON setting.account_id = subscription.subscriber_id
                WHERE subscription.target_account_id = ?
                  AND subscription.subscription_st = 'ACTIVE'
                  AND (period.end_dt IS NULL OR period.end_dt > now())
                  AND COALESCE(setting.notify_taster_new_place, TRUE)
                """,
                (rs, row) -> rs.getObject(1, UUID.class),
                tasterId);
    }

    /** 같은 받는 사람·이벤트 키의 알림이 이미 있으면 새로 만들지 않습니다(uk_user_notifications_recipient_event). */
    private void insert(
            UUID recipientId,
            NotificationType type,
            String title,
            String message,
            String targetType,
            String targetId,
            String eventKey) {
        jdbc.update(
                """
                INSERT INTO user_notifications (
                    recipient_account_id, notification_type, title, message, target_type, target_id, event_key
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (recipient_account_id, event_key) WHERE event_key IS NOT NULL DO NOTHING
                """,
                recipientId,
                type.name(),
                title,
                message,
                targetType,
                targetId,
                eventKey);
    }
}
