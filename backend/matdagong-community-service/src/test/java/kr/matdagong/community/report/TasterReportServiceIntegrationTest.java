package kr.matdagong.community.report;

import static kr.matdagong.community.report.ReportModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.community.notification.NotificationService;
import kr.matdagong.community.profile.UserProfileService;
import kr.matdagong.community.subscription.SubscriptionService;
import kr.matdagong.community.taster.TasterService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 맛객 신고가 한 사람당 한 번만 쌓이고, 3명이면 확인 목록, 5명이면 자동 가림이 되는지 실제 스키마로 확인합니다. */
class TasterReportServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID PLACE_ID = UUID.fromString("50000000-0000-0000-0000-000000000001");
    private static final UUID TARGET = UUID.fromString("30000000-0000-0000-0000-000000000001");
    private static final List<UUID> REPORTERS = IntStream.rangeClosed(1, 6)
            .mapToObj(index -> UUID.fromString("40000000-0000-0000-0000-00000000000" + index))
            .toList();

    private TasterReportService reports;
    private NotificationService notifications;

    @BeforeEach
    void setUp() {
        truncate("user_profiles, user_notifications");
        notifications = new NotificationService(jdbc);
        reports = new TasterReportService(jdbc, notifications);
        profile(TARGET, "신고대상");
        for (int index = 0; index < REPORTERS.size(); index++) profile(REPORTERS.get(index), "신고자" + index);
    }

    @Test
    void 같은_사람은_확인_전에_한_번만_신고할_수_있다() {
        reports.report(REPORTERS.get(0), TARGET, request(ReportReason.ABUSIVE));

        assertStatus(
                () -> reports.report(REPORTERS.get(0), TARGET, request(ReportReason.SPAM)),
                HttpStatus.CONFLICT,
                TasterReportService.ALREADY_REPORTED);
        assertThat(reports.myPendingTargets(REPORTERS.get(0))).containsExactly(TARGET.toString());
        assertThat(reports.myPendingTargets(REPORTERS.get(1))).isEmpty();
    }

    @Test
    void 세_명이면_확인_목록에_오르고_다섯_명이면_가려지며_본인에게_알린다() {
        reportBy(2);
        assertThat(reviewRequested()).isFalse();

        reportBy(1);
        assertThat(reviewRequested()).isTrue();
        assertThat(reports.hiddenTasters()).isEmpty();

        reportBy(2);
        assertThat(reports.hiddenTasters()).containsExactly(TARGET);
        assertThat(notifications.list(TARGET).items()).singleElement().satisfies(item -> assertThat(item.title())
                .contains("임시로 가려졌어요"));

        // 가린 뒤 신고가 더 와도 알림은 다시 만들지 않습니다.
        reportBy(1);
        assertThat(notifications.list(TARGET).items()).hasSize(1);
    }

    @Test
    void 불법_사진_신고는_한_건만으로도_확인_목록에_오른다() {
        reports.report(REPORTERS.get(0), TARGET, request(ReportReason.ILLEGAL_PHOTO));

        assertThat(reviewRequested()).isTrue();
        assertThat(reports.hiddenTasters()).isEmpty();
    }

    @Test
    void 가려진_맛객은_목록과_사진에서_빠지고_본인_프로필에_표시된다() {
        reportBy(5);

        UserProfileService profiles = new UserProfileService(jdbc);
        TasterService tasters = new TasterService(jdbc, new SubscriptionService(jdbc, notifications));
        assertThat(tasters.tasters(REPORTERS.get(0), Map.of()))
                .extracting(taster -> taster.tasterId())
                .doesNotContain(TARGET.toString());
        assertThat(profiles.findProfile(TARGET)).hasValueSatisfying(profile -> assertThat(profile.hiddenByReports())
                .isTrue());
        assertThat(profiles.findProfile(REPORTERS.get(0)))
                .hasValueSatisfying(
                        profile -> assertThat(profile.hiddenByReports()).isFalse());
    }

    @Test
    void 나_자신이나_없는_맛객은_신고할_수_없고_설명이_꼭_필요하다() {
        assertStatus(
                () -> reports.report(TARGET, TARGET, request(ReportReason.SPAM)),
                HttpStatus.BAD_REQUEST,
                "내 프로필은 신고할 수 없어요.");
        assertStatus(
                () -> reports.report(REPORTERS.get(0), UUID.randomUUID(), request(ReportReason.SPAM)),
                HttpStatus.NOT_FOUND,
                "맛객 정보를 찾을 수 없어요.");
        assertStatus(
                () -> reports.report(REPORTERS.get(0), TARGET, new ReportRequest(ReportReason.ADVERTISING, " ", null)),
                HttpStatus.BAD_REQUEST,
                "어떤 점이 문제인지 적어 주세요.");
        // 서비스를 거치지 않은 저장도 DB가 빈 설명을 막습니다(V43).
        assertThatThrownBy(() -> jdbc.update(
                        """
                        INSERT INTO taster_reports (report_id, target_account_id, reporter_account_id, reason, memo)
                        VALUES (?, ?, ?, 'SPAM', ' ')
                        """,
                        UUID.randomUUID(),
                        TARGET,
                        REPORTERS.get(0)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /** 아직 신고하지 않은 사람 count명이 차례로 신고합니다. */
    private void reportBy(int count) {
        List<String> already = jdbc.queryForList(
                "SELECT reporter_account_id::text FROM taster_reports WHERE target_account_id = ?",
                String.class,
                TARGET);
        REPORTERS.stream()
                .filter(reporter -> !already.contains(reporter.toString()))
                .limit(count)
                .forEach(reporter -> reports.report(reporter, TARGET, request(ReportReason.ABUSIVE)));
    }

    private static boolean reviewRequested() {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM taster_moderations WHERE account_id = ? AND review_requested_at IS NOT NULL
                )
                """,
                Boolean.class,
                TARGET));
    }

    private static ReportRequest request(ReportReason reason) {
        return new ReportRequest(reason, "기록 사진에 다른 가게 광고가 있어요.", PLACE_ID);
    }

    private static void assertStatus(Runnable action, HttpStatus status, String detail) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
            assertThat(exception.getStatusCode()).isEqualTo(status);
            assertThat(exception.getReason()).isEqualTo(detail);
        });
    }

    private static void profile(UUID accountId, String nickname) {
        jdbc.update(
                "INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, ?, 1)",
                accountId,
                nickname);
    }
}
