package kr.matdagong.community;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import kr.matdagong.common.module.TasterDirectory.AuthorProfile;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.community.notification.NotificationService;
import kr.matdagong.community.report.TasterReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 장소 모듈이 기록 작성자와 가려진 맛객을 물을 때(TasterDirectory) 실제 스키마로 맞게 답하는지 확인합니다. */
class TasterDirectoryAdapterIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID TASTER = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID HIDDEN = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private TasterDirectoryAdapter directory;

    @BeforeEach
    void setUp() {
        truncate("user_profiles");
        directory = new TasterDirectoryAdapter(jdbc, new TasterReportService(jdbc, new NotificationService(jdbc)));
        profile(TASTER, "골목맛객");
        profile(HIDDEN, "가려진맛객");
        jdbc.update("INSERT INTO taster_moderations (account_id, hidden_at) VALUES (?, now())", HIDDEN);
    }

    @Test
    void 작성자_닉네임과_신고로_가려졌는지를_돌려주고_프로필이_없으면_비어_있다() {
        assertThat(directory.authorProfile(TASTER)).contains(new AuthorProfile("골목맛객", false));
        assertThat(directory.authorProfile(HIDDEN)).contains(new AuthorProfile("가려진맛객", true));
        assertThat(directory.authorProfile(UUID.randomUUID())).isEmpty();
    }

    @Test
    void 가려진_맛객만_돌려준다() {
        assertThat(directory.hiddenTasters()).containsExactly(HIDDEN);
    }

    private static void profile(UUID accountId, String nickname) {
        jdbc.update(
                "INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, ?, 1)",
                accountId,
                nickname);
    }
}
