package kr.matdagong.place.trust;

import static kr.matdagong.place.trust.TasteTrustModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.like.PlaceLikeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 하트·별로였던 곳·기록을 실제 스키마에 저장하고 맛객 사이 경험 신뢰 재료를 검증합니다. */
class TasteTrustServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID ME = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TASTER = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OTHER = UUID.fromString("33333333-3333-3333-3333-333333333333");

    private PlaceLikeService likes;
    private TasteTrustService trust;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_place_likes, user_place_dislikes, place_quick_drafts");
        likes = new PlaceLikeService(jdbc);
        trust = new TasteTrustService(jdbc);
    }

    @Test
    void 나만_보기_기록과_입맛에_맞았던_하트도_인정으로_세고_가_보고_싶은_하트는_세지_않는다() {
        UUID first = place("1");
        UUID second = place("2");
        UUID third = place("3");
        record(TASTER, first, "PUBLIC");
        record(TASTER, second, "PUBLIC");
        record(TASTER, third, "PUBLIC");
        record(ME, first, "PRIVATE");
        quickSave(ME, "2");
        likes.setLiked(ME, second.toString(), true, true);
        likes.setLiked(ME, third.toString(), true, false);

        // 둘 다 태그를 고르지 않은 기록은 비교할 수 없어 태그 일치가 없습니다.
        assertThat(trust.statsFor(ME)).containsExactly(new TasteTrustStats(TASTER.toString(), 2, 0, null));
    }

    @Test
    void 신뢰_재료는_어느_쪽에서_물어도_같다() {
        UUID first = place("1");
        UUID second = place("2");
        record(TASTER, first, "PUBLIC", "국물", "혼밥");
        record(ME, first, "PRIVATE", "국물");
        quickSave(ME, "2");
        quickSave(TASTER, "2");
        likes.setLiked(ME, second.toString(), true, true);
        likes.setLiked(TASTER, second.toString(), true, true);

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
        likes.setDisliked(ME, first.toString(), true);
        likes.setDisliked(TASTER, second.toString(), true);

        assertThat(trust.statsFor(ME)).containsExactly(new TasteTrustStats(TASTER.toString(), 0, 2, null));
    }

    @Test
    void 태그_일치는_둘_다_기록한_맛집만_비교하고_계정마다_따로_평균낸다() {
        UUID first = place("1");
        UUID second = place("2");
        record(ME, first, "PUBLIC", "국물", "혼밥");
        record(ME, second, "PUBLIC", "커피");
        record(TASTER, first, "PUBLIC", "국물", "혼밥");
        record(TASTER, second, "PUBLIC", "디저트");
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
        likes.setLiked(ME, placeId, true, false);

        likes.setDisliked(ME, placeId, true);
        assertThat(likes.likedPlaceIds(ME)).isEmpty();
        assertThat(likes.dislikedPlaceIds(ME)).containsExactly(placeId);

        likes.setLiked(ME, placeId, true, true);
        assertThat(likes.dislikedPlaceIds(ME)).isEmpty();
        assertThat(likes.visitedLikedPlaceIds(ME)).containsExactly(placeId);

        likes.setLiked(ME, placeId, true, false);
        assertThat(likes.visitedLikedPlaceIds(ME)).isEmpty();
        assertThat(likes.likedPlaceIds(ME)).containsExactly(placeId);
    }

    @Test
    void 빠른_저장이나_기록을_옮긴_하트가_없으면_다녀온_맛을_고를_수_없고_가_보고_싶어요만_된다() {
        String visitedPlace = place("1").toString();
        String unvisitedPlace = place("2").toString();
        quickSave(ME, "1");

        for (Runnable choice : List.<Runnable>of(
                () -> likes.setLiked(ME, unvisitedPlace, true, true),
                () -> likes.setDisliked(ME, unvisitedPlace, true))) {
            assertThatThrownBy(choice::run).isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(exception.getReason()).isEqualTo("이 가게에서 빠른 저장이나 맛집 기록을 남긴 뒤에 다녀온 맛을 고를 수 있어요.");
            });
        }
        likes.setLiked(ME, unvisitedPlace, true, false);
        likes.setLiked(ME, visitedPlace, true, true);

        assertThat(likes.likedPlaceIds(ME)).containsExactlyInAnyOrder(visitedPlace, unvisitedPlace);
        assertThat(likes.visitProofPlaceIds(ME)).containsExactly(visitedPlace);
    }

    @Test
    void 내가_기록한_맛집은_별로였던_곳으로_남길_수_없다() {
        UUID placeId = place("1");
        record(ME, placeId, "PRIVATE");

        assertThatThrownBy(() -> likes.setDisliked(ME, placeId.toString(), true))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).isEqualTo("내가 등록한 맛집은 별로였던 곳으로 남길 수 없습니다.");
                });
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

    /** 현재 위치 1km 안에서만 되는 빠른 저장으로 그 가게에 들른 근거를 남깁니다. */
    private static void quickSave(UUID accountId, String providerPlaceId) {
        jdbc.update(
                """
                INSERT INTO place_quick_drafts(draft_id, account_id, provider_place_id, place_name, address, latitude, longitude)
                VALUES (?, ?, ?, '국밥집', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                UUID.randomUUID(),
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
            jdbc.update("INSERT INTO restaurant_record_tags(record_id, tag_name) VALUES (?, ?)", recordId, label);
        }
    }
}
