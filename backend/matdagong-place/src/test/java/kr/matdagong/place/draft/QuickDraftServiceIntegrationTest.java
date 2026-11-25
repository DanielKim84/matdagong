package kr.matdagong.place.draft;

import static kr.matdagong.place.draft.QuickDraftModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.location.DeviceLocation;
import kr.matdagong.place.location.NearbyPlaceGuard;
import kr.matdagong.place.visit.PlaceVisitService;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 빠른 기록의 중복 확인(내 기록·빠른 기록·보여 줄 가게 이름)이 한 번의 조회로 맞게 나오는지 실제 스키마로 확인합니다. */
class QuickDraftServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID ME = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final DeviceLocation NEAR = new DeviceLocation(37.566, 126.991);

    private QuickDraftService drafts;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, place_quick_drafts");
        drafts = new QuickDraftService(jdbc, new NearbyPlaceGuard(jdbc), new PlaceVisitService(jdbc));
    }

    @Test
    void 처음_보는_가게는_중복이_아니고_이름도_없다() {
        assertThat(drafts.checkDuplicate(ME, "KAKAO", "1001"))
                .isEqualTo(new QuickPlaceDuplicateView(false, false, null));
    }

    @Test
    void 남의_비공개_기록만_있는_가게는_이름을_알려_주지_않고_공개_기록이면_알려_준다() {
        UUID placeId = place("1001", "국밥집");
        record(OTHER, placeId, "PRIVATE");
        assertThat(drafts.checkDuplicate(ME, "KAKAO", "1001"))
                .isEqualTo(new QuickPlaceDuplicateView(false, false, null));

        jdbc.update("UPDATE restaurant_records SET visibility = 'PUBLIC'");

        assertThat(drafts.checkDuplicate(ME, "kakao", "1001"))
                .isEqualTo(new QuickPlaceDuplicateView(false, false, "국밥집"));
    }

    @Test
    void 내가_기록한_가게는_이미_등록된_곳이라_빠른_저장할_수_없다() {
        UUID placeId = place("1001", "국밥집");
        record(ME, placeId, "PRIVATE");

        assertThat(drafts.checkDuplicate(ME, "KAKAO", "1001"))
                .isEqualTo(new QuickPlaceDuplicateView(true, false, "국밥집"));
        assertConflict(
                () -> drafts.saveDraft(ME, request("1001").submittedPlace(), request("1001")), "이미 내가 기록한 장소예요.");
    }

    @Test
    void 빠른_저장한_가게는_담은_이름을_알려_주고_다시_저장할_수_없다() {
        drafts.saveDraft(ME, request("1001").submittedPlace(), request("1001"));

        assertThat(drafts.checkDuplicate(ME, "KAKAO", "1001"))
                .isEqualTo(new QuickPlaceDuplicateView(false, true, "국밥집"));
        assertThat(drafts.checkDuplicate(OTHER, "KAKAO", "1001"))
                .isEqualTo(new QuickPlaceDuplicateView(false, false, null));
        assertConflict(
                () -> drafts.saveDraft(ME, request("1001").submittedPlace(), request("1001")), "이미 빠른 기록에 저장된 장소예요.");
    }

    private static QuickPlaceDraftRequest request(String providerPlaceId) {
        return new QuickPlaceDraftRequest(
                "KAKAO", providerPlaceId, "국밥집", "한식", "서울 중구 을지로 1", 37.566, 126.991, null, null, null, null, NEAR);
    }

    private static UUID place(String providerPlaceId, String name) {
        UUID placeId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO restaurant_places (place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?, ?, ?, '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId,
                providerPlaceId,
                name);
        return placeId;
    }

    private static void record(UUID accountId, UUID placeId, String visibility) {
        jdbc.update(
                """
                INSERT INTO restaurant_records (record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?, ?, '맛객', '국물이 진하고 맛있어요.', ?)
                """,
                UUID.randomUUID(),
                placeId,
                accountId,
                visibility);
    }

    private static void assertConflict(ThrowingCallable call, String detail) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
            assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(exception.getReason()).isEqualTo(detail);
        });
    }
}
