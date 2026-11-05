package kr.matdagong.community.profile;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 맛다공 회원 탈퇴 때 이 계정의 커뮤니티 데이터를 한 트랜잭션으로 모두 지웁니다.
 * 계정 테이블은 인증 DB에 있어 외래 키가 없으므로, 계정 ID를 담은 테이블을 여기서 직접 정리합니다.
 * 프로필·배경 사진은 DB(bytea)에 있어 행과 함께 지워지고, 이미 지운 계정을 다시 요청해도 그대로 성공합니다.
 */
@Service
public class WithdrawalService {
    private final JdbcTemplate jdbc;

    public WithdrawalService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void withdraw(UUID accountId) {
        deleteSubscriptions(accountId);
        // 다른 사람에게 간 새 구독자 알림도 target_id로 이 계정을 가리키므로 함께 지웁니다.
        jdbc.update(
                """
                DELETE FROM user_notifications
                WHERE recipient_account_id = ?
                   OR (notification_type = 'NEW_SUBSCRIBER' AND target_type = 'MY_SUBSCRIBERS' AND target_id = ?)
                """,
                accountId,
                accountId.toString());
        jdbc.update("DELETE FROM user_notification_settings WHERE account_id = ?", accountId);
        jdbc.update("DELETE FROM user_point_history WHERE account_id = ?", accountId);
        // taste_tag_requests는 user_profiles를 ON DELETE CASCADE 없이 참조하므로 프로필보다 먼저 지웁니다.
        jdbc.update("DELETE FROM taste_tag_requests WHERE account_id = ?", accountId);
        // 내가 낸 신고는 신고한 사람 쪽 외래 키가 없어 직접 지웁니다. 나를 향한 신고·처리 상태는 프로필과 함께 CASCADE로 지워집니다.
        jdbc.update("DELETE FROM taster_reports WHERE reporter_account_id = ?", accountId);
        // 취향 태그(user_profile_tags·user_preference_tags)와 배경 사진(user_profile_cover_photos)은 CASCADE로 함께 지워집니다.
        jdbc.update("DELETE FROM user_profiles WHERE account_id = ?", accountId);
    }

    /** 내가 구독한 관계와 나를 구독한 관계를 모두 지웁니다. 회차 이력은 구독을 CASCADE 없이 참조해 먼저 지웁니다. */
    private void deleteSubscriptions(UUID accountId) {
        jdbc.update(
                """
                DELETE FROM user_subscription_history
                WHERE subscription_id IN (
                    SELECT subscription_id FROM user_subscriptions
                    WHERE subscriber_id = ? OR target_account_id = ?
                )
                """,
                accountId,
                accountId);
        jdbc.update(
                "DELETE FROM user_subscriptions WHERE subscriber_id = ? OR target_account_id = ?",
                accountId,
                accountId);
    }
}
