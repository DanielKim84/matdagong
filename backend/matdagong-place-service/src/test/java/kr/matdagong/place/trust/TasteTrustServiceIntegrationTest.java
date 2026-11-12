package kr.matdagong.place.trust;

import static kr.matdagong.place.trust.TasteTrustModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.like.PlaceLikeService;
import kr.matdagong.place.location.DeviceLocation;
import kr.matdagong.place.location.NearbyPlaceGuard;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 하트·별로였던 곳·기록을 실제 스키마에 저장하고 맛객 사이 경험 신뢰 재료를 검증합니다. */
class TasteTrustServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID ME = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TASTER = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OTHER = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final DeviceLocation NO_LOCATION = null;

    private PlaceLikeService likes;
    private TasteTrustService trust;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_place_likes, user_place_dislikes, user_place_visits, place_quick_drafts");
        likes = new PlaceLikeService(jdbc, new NearbyPlaceGuard(jdbc));
        trust = new TasteTrustService(jdbc);
    }

    @Test
    void 공개와_나만_보기_기록은_인정으로_세고_가볼_곳_하트는_세지_않는다() {
        UUID first = place("1");
        UUID second = place("2");
        UUID third = place("3");
        record(TASTER, first, "PUBLIC");
        record(TASTER, second, "PUBLIC");
        record(TASTER, third, "PUBLIC");
        record(ME, first, "PRIVATE");
        record(ME, second, "PUBLIC");
        likes.setLiked(ME, third.toString(), true);

        // 둘 다 태그를 고르지 않은 기록은 비교할 수 없어 태그 일치가 없습니다.
        assertThat(trust.statsFor(ME)).containsExactly(new TasteTrustStats(TASTER.toString(), 2, 0, null));
    }

    @Test
    void 신뢰_재료는_어느_쪽에서_물어도_같다() {
        UUID first = place("1");
        UUID second = place("2");
        record(TASTER, first, "PUBLIC", "국물이 진한", "혼밥");
        record(ME, first, "PRIVATE", "국물이 진한");
        record(ME, second, "PUBLIC");
        record(TASTER, second, "PUBLIC");

        TasteTrustStats fromMe = trust.statsFor(ME).get(0);
        TasteTrustStats fromTaster = trust.statsFor(TASTER).get(0);

        assertThat(fromMe.accountId()).isEqualTo(TASTER.toString());
        assertThat(fromTaster.accountId()).isEqualTo(ME.toString());
        assertThat(List.of(fromMe.agreedCount(), fromMe.conflictCount(), fromMe.tagMatchPercent()))
                .containsExactly(2, 0, 50)
                .isEqualTo(List.of(fromTaster.agreedCount(), fromTaster.conflictCount(), fromTaster.tagMatchPercent()));
    }

    @Test
    void 한쪽이_인정하고_다른_쪽이_별로였던_곳은_엇갈림으로_센다() {
        UUID first = place("1");
        UUID second = place("2");
        record(TASTER, first, "PUBLIC");
        record(ME, second, "PUBLIC");
        quickSave(ME, "1");
        quickSave(TASTER, "2");
        likes.setDisliked(ME, first.toString(), true, NO_LOCATION);
        likes.setDisliked(TASTER, second.toString(), true, NO_LOCATION);

        assertThat(trust.statsFor(ME)).containsExactly(new TasteTrustStats(TASTER.toString(), 0, 2, null));
    }

    @Test
    void 태그_일치는_둘_다_기록한_맛집만_비교하고_계정마다_따로_평균낸다() {
        UUID first = place("1");
        UUID second = place("2");
        record(ME, first, "PUBLIC", "국물이 진한", "혼밥");
        record(ME, second, "PUBLIC", "커피 맛집");
        record(TASTER, first, "PUBLIC", "국물이 진한", "혼밥");
        record(TASTER, second, "PUBLIC", "디저트 카페");
        record(OTHER, first, "PUBLIC");

        assertThat(trust.statsFor(ME))
                .containsExactly(
                        new TasteTrustStats(TASTER.toString(), 2, 0, 50),
                        new TasteTrustStats(OTHER.toString(), 1, 0, 0));
    }

    @Test
    void 별로였던_곳으로_남기면_하트가_지워지고_다시_하트하면_별로였던_표시가_지워진다() {
        String placeId = place("1").toString();
        quickSave(ME, "1");
        likes.setLiked(ME, placeId, true);

        likes.setDisliked(ME, placeId, true, NO_LOCATION);
        assertThat(likes.likedPlaceIds(ME)).isEmpty();
        assertThat(likes.dislikedPlaceIds(ME)).containsExactly(placeId);

        likes.setLiked(ME, placeId, true);
        assertThat(likes.dislikedPlaceIds(ME)).isEmpty();
        assertThat(likes.likedPlaceIds(ME)).containsExactly(placeId);
    }

    @Test
    void 방문_근거가_없으면_별로였어요는_고를_수_없고_가볼_곳은_저장된다() {
        String visitedPlace = place("1").toString();
        String unvisitedPlace = place("2").toString();
        quickSave(ME, "1");

        assertVisitProofRequired(() -> likes.setDisliked(ME, unvisitedPlace, true, NO_LOCATION));
        likes.setLiked(ME, unvisitedPlace, true);

        assertThat(likes.likedPlaceIds(ME)).containsExactly(unvisitedPlace);
        // 빠른 저장한 곳은 다녀온 곳이 되어 위치 없이 별로였어요를 고를 수 있습니다.
        likes.setDisliked(ME, visitedPlace, true, NO_LOCATION);
        assertThat(likes.dislikedPlaceIds(ME)).containsExactly(visitedPlace);
    }

    @Test
    void 방문_근거가_없어도_지금_가게_1km_안이면_별로였어요를_고를_수_있다() {
        String placeId = place("1").toString();
        likes.setLiked(ME, placeId, true);

        // 가게(37.566, 126.991)에서 10km쯤 떨어진 곳에서는 고를 수 없습니다.
        assertVisitProofRequired(() -> likes.setDisliked(ME, placeId, true, new DeviceLocation(37.656, 126.991)));

        likes.setDisliked(ME, placeId, true, new DeviceLocation(37.5665, 126.9915));

        assertThat(likes.likedPlaceIds(ME)).isEmpty();
        assertThat(likes.dislikedPlaceIds(ME)).containsExactly(placeId);
    }

    @Test
    void 내가_기록한_맛집은_별로였던_곳으로_남길_수_없다() {
        UUID placeId = place("1");
        record(ME, placeId, "PRIVATE");

        assertThatThrownBy(() -> likes.setDisliked(ME, placeId.toString(), true, NO_LOCATION))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).isEqualTo("내가 등록한 맛집은 별로였던 곳으로 남길 수 없습니다.");
                });
    }

    @Test
    void 없는_장소나_UUID가_아닌_ID는_하트하거나_별로였어요로_남길_수_없다() {
        String missingPlace = UUID.randomUUID().toString();

        for (ThrowingCallable call : List.<ThrowingCallable>of(
                () -> likes.setLiked(ME, missingPlace, true),
                () -> likes.setLiked(ME, "없는-ID", true),
                () -> likes.setLiked(ME, "없는-ID", false),
                () -> likes.setDisliked(ME, missingPlace, true, NO_LOCATION))) {
            assertThatThrownBy(call).isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(exception.getReason()).isEqualTo("저장할 맛집을 확인해 주세요.");
            });
        }
        assertThat(likes.likedPlaceIds(ME)).isEmpty();
    }

    @Test
    void 다른_계정의_인정과_엇갈림은_내가_인정하거나_별로였던_곳에서만_센다() {
        UUID mine = place("1");
        UUID disliked = place("2");
        UUID unrelated = place("3");
        record(ME, mine, "PUBLIC");
        quickSave(ME, "2");
        likes.setDisliked(ME, disliked.toString(), true, NO_LOCATION);
        record(TASTER, mine, "PUBLIC");
        record(TASTER, disliked, "PUBLIC");
        record(TASTER, unrelated, "PUBLIC");
        record(OTHER, unrelated, "PUBLIC");

        assertThat(trust.statsFor(ME)).containsExactly(new TasteTrustStats(TASTER.toString(), 1, 1, null));
    }

    private static UUID place(String providerPlaceId) {
        UUID placeId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO restaurant_places(place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?, ?, '국밥집', '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId,
                providerPlaceId);
        return placeId;
    }

    private static void assertVisitProofRequired(ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
            assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
            assertThat(exception.getReason()).isEqualTo("직접 다녀온 곳만 별로였다고 남길 수 있어요. 가게 근처(1km)에서 다시 골라 주세요.");
        });
    }

    /** 현재 위치 1km 안에서만 되는 빠른 저장으로 그 가게에 들른 근거를 남깁니다. */
    /** 실제 빠른 저장(QuickDraftService.saveDraft)처럼 빠른 기록과 다녀온 곳(QUICK_SAVE)을 함께 남깁니다. 가게가 먼저 있어야 합니다. */
    private static void quickSave(UUID accountId, String providerPlaceId) {
        jdbc.update(
                """
                INSERT INTO place_quick_drafts(account_id, provider_place_id, place_name, address, latitude, longitude)
                VALUES (?, ?, '국밥집', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                accountId,
                providerPlaceId);
        jdbc.update(
                """
                INSERT INTO user_place_visits(account_id, place_id, visit_source)
                SELECT ?, place_id, 'QUICK_SAVE' FROM restaurant_places WHERE provider_code = 'KAKAO' AND provider_place_id = ?
                """,
                accountId,
                providerPlaceId);
    }

    private static void record(UUID accountId, UUID placeId, String visibility, String... labels) {
        UUID recordId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO restaurant_records(record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?, ?, '맛객', '국물이 진하고 맛있어요.', ?)
                """,
                recordId,
                placeId,
                accountId,
                visibility);
        for (String label : labels) {
            jdbc.update(
                    "INSERT INTO restaurant_record_tags(record_id, tag_name, tag_group) VALUES (?, ?, 'TASTE')",
                    recordId,
                    label);
        }
    }
}
