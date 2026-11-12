package kr.matdagong.place.record;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static kr.matdagong.place.record.PlaceRecordModels.*;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.catalog.PlaceQueryService;
import kr.matdagong.place.catalog.PlaceUpserts;
import kr.matdagong.place.catalog.PlaceViewLoader;
import kr.matdagong.place.draft.QuickDraftService;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import kr.matdagong.place.like.PlaceLikeService;
import kr.matdagong.place.location.NearbyPlaceGuard;
import kr.matdagong.place.profile.CommunityProfileClient.AuthorProfile;
import kr.matdagong.place.visit.PlaceVisitService;
import kr.matdagong.place.visit.PlaceVisitService.VisitSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 장소 고유 정보(restaurant_places)와 맛객별 추천 기록(restaurant_records 및 하위 메뉴·태그·방문 조건·사진)을
 * 나눠 저장합니다. 같은 장소에 내 기록이 이미 있으면 새로 만들지 않고 그 기록을 요청 내용으로 바꿉니다.
 * 하위 내용 저장은 PlaceRecordContentWriter가 같은 트랜잭션 안에서 맡습니다. 새 가게 기록은 기기가 가게 1km 안일 때만
 * 저장하고(이미 다녀온 곳이면 생략), 기록한 가게는 다녀온 곳으로 남깁니다.
 */
@Service
public class PlaceRecordService {
    private static final String NEW_RECORD_TOO_FAR =
            "현재 위치에서 " + NearbyPlaceGuard.MAX_VISIT_DISTANCE_LABEL + " 안에 있는 장소만 등록할 수 있어요.";

    private final JdbcTemplate jdbc;
    private final PlaceQueryService places;
    private final PlaceViewLoader loader;
    private final PlaceRecordContentWriter contents;
    private final QuickDraftService drafts;
    private final PlaceLikeService likes;
    private final NearbyPlaceGuard nearby;
    private final PlaceVisitService visits;

    public PlaceRecordService(
            JdbcTemplate jdbc,
            PlaceQueryService places,
            PlaceViewLoader loader,
            PlaceRecordContentWriter contents,
            QuickDraftService drafts,
            PlaceLikeService likes,
            NearbyPlaceGuard nearby,
            PlaceVisitService visits) {
        this.jdbc = jdbc;
        this.places = places;
        this.loader = loader;
        this.contents = contents;
        this.drafts = drafts;
        this.likes = likes;
        this.nearby = nearby;
        this.visits = visits;
    }

    /** 내 기록함 전용 목록은 공개 여부와 관계없이 본인 기록만 반환합니다. 계정마다 장소 하나에 기록은 하나입니다. */
    @Transactional(readOnly = true)
    public List<PlaceView> findMine(UUID accountId) {
        List<UUID> ids = jdbc.query(
                "SELECT place_id FROM restaurant_records WHERE account_id = ? ORDER BY place_id",
                (rs, row) -> rs.getObject("place_id", UUID.class),
                accountId);
        return loader.load(ids, accountId, PlaceViewLoader.RecordScope.OWN_ONLY);
    }

    /**
     * 기록을 저장하고 저장된 장소를 반환합니다. 작성자 프로필과 가게 정보는 외부 호출이라 호출하는 쪽이 트랜잭션 밖에서
     * 먼저 확인해 넘깁니다. 내 기록이 있는 장소는 하트·별로였던 곳으로 두지 않으므로 같은 장소의 빠른 기록·하트·별로였던 곳
     * 표시를 함께 지웁니다(하트한 곳을 기록할 때는 화면이 직접 다녀왔는지 먼저 묻습니다).
     */
    @Transactional
    public PlaceView createRecord(
            UUID accountId, AuthorProfile author, PlaceInfo placeInfo, CreatePlaceRecordRequest request) {
        contents.validate(request);
        if (!hasVisited(accountId, request)) {
            nearby.requireNearby(
                    request.deviceLocation(),
                    placeInfo,
                    request.providerCode(),
                    request.providerPlaceId(),
                    NEW_RECORD_TOO_FAR);
        }
        UUID placeId = PlaceUpserts.upsert(
                jdbc, request.providerCode(), request.providerPlaceId(), request.category(), placeInfo);
        UUID recordId = upsertRecord(placeId, accountId, author, request);
        contents.replaceContents(recordId, request);
        drafts.deleteDraft(accountId, request.providerCode(), request.providerPlaceId());
        likes.removeLike(accountId, placeId);
        likes.removeDislike(accountId, placeId);
        visits.markVisited(accountId, placeId, VisitSource.RECORD);
        return places.findById(placeId, accountId).orElseThrow();
    }

    /**
     * 위치를 다시 확인하지 않아도 되는, 이미 다녀온 곳인지 봅니다. 빠른 저장(저장할 때 위치를 확인함)과 기록은 늘 다녀온 곳을
     * 함께 남기고 기록을 지워도 남으므로, 빠른 저장에서 이어 쓰기·내 기록 수정·지운 기록 다시 남기기가 모두 여기에 듭니다.
     * 이 가게(제공자 ID)의 것만 셉니다. 다른 장소의 근거로 엉뚱한 가게를 등록하지 못하게 하려는 것입니다. 별로였던 곳은
     * 근거로 세지 않습니다.
     */
    private boolean hasVisited(UUID accountId, CreatePlaceRecordRequest request) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM restaurant_places p
                    JOIN user_place_visits v ON v.place_id = p.place_id AND v.account_id = ?
                    WHERE p.provider_code = ? AND p.provider_place_id = ?
                )
                """,
                Boolean.class,
                accountId,
                PlaceIdentifiers.providerCode(request.providerCode()),
                request.providerPlaceId()));
    }

    /** 내 기록 여러 곳의 공개 범위를 한 번에 바꿉니다. 내 기록이 없는 장소는 건너뛰고, 바뀐 기록 수를 돌려줍니다. */
    @Transactional
    public int changeVisibility(UUID accountId, List<String> placeIds, RecordVisibility visibility) {
        List<Object[]> targets = placeIds.stream()
                .map(PlaceIdentifiers::uuidOrNull)
                .filter(Objects::nonNull)
                .distinct()
                .map(placeId -> new Object[] {visibility.name(), placeId, accountId})
                .toList();
        if (targets.isEmpty()) return 0;
        int[] counts = jdbc.batchUpdate(
                """
                UPDATE restaurant_records SET visibility = ?, upd_dt = now()
                WHERE place_id = ? AND account_id = ?
                """,
                targets);
        return Arrays.stream(counts).sum();
    }

    /**
     * 이 장소의 내 기록을 지웁니다. 메뉴·태그·방문 조건·사진은 ON DELETE CASCADE로 함께 지워지고,
     * 다른 맛객도 함께 쓰는 가게 행(restaurant_places), 하트, 다녀온 곳은 그대로 둡니다. 지운 기록이 없으면 false입니다.
     */
    @Transactional
    public boolean deleteRecord(UUID accountId, String placeId) {
        UUID id = PlaceIdentifiers.uuidOrNull(placeId);
        if (id == null) return false;
        return jdbc.update("DELETE FROM restaurant_records WHERE place_id = ? AND account_id = ?", id, accountId) > 0;
    }

    /** 작성자 이름은 기록 시점의 커뮤니티 프로필 값으로 함께 저장합니다. 캐릭터·사진은 화면이 커뮤니티 프로필에서 채웁니다. */
    private UUID upsertRecord(UUID placeId, UUID accountId, AuthorProfile author, CreatePlaceRecordRequest request) {
        return jdbc.queryForObject(
                """
                INSERT INTO restaurant_records (record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (account_id, place_id) DO UPDATE SET
                    author_name = EXCLUDED.author_name,
                    reason = EXCLUDED.reason, visibility = EXCLUDED.visibility, upd_dt = now()
                RETURNING record_id
                """,
                UUID.class,
                UUID.randomUUID(),
                placeId,
                accountId,
                author.nickname().trim(),
                request.reason().trim(),
                request.visibility().name());
    }
}
