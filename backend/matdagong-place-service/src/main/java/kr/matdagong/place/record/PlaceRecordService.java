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
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 장소 고유 정보(restaurant_places)와 맛객별 추천 기록(restaurant_records 및 하위 메뉴·태그·방문 조건·사진)을
 * 나눠 저장합니다. 같은 장소에 내 기록이 이미 있으면 새로 만들지 않고 그 기록을 요청 내용으로 바꿉니다.
 * 하위 내용 저장은 PlaceRecordContentWriter가 같은 트랜잭션 안에서 맡습니다.
 */
@Service
public class PlaceRecordService {
    private static final String NEW_RECORD_TOO_FAR = "현재 위치에서 1km 안에 있는 장소만 등록할 수 있어요.";

    private final JdbcTemplate jdbc;
    private final PlaceQueryService places;
    private final PlaceViewLoader loader;
    private final PlaceRecordContentWriter contents;
    private final QuickDraftService drafts;
    private final PlaceLikeService likes;
    private final NearbyPlaceGuard nearby;

    public PlaceRecordService(
            JdbcTemplate jdbc,
            PlaceQueryService places,
            PlaceViewLoader loader,
            PlaceRecordContentWriter contents,
            QuickDraftService drafts,
            PlaceLikeService likes,
            NearbyPlaceGuard nearby) {
        this.jdbc = jdbc;
        this.places = places;
        this.loader = loader;
        this.contents = contents;
        this.drafts = drafts;
        this.likes = likes;
        this.nearby = nearby;
    }

    /** 내 기록함 전용 목록은 공개 여부와 관계없이 본인 기록만 반환합니다. */
    @Transactional(readOnly = true)
    public List<PlaceView> findMine(UUID accountId) {
        List<UUID> ids = jdbc.query(
                """
                SELECT DISTINCT p.place_id
                FROM restaurant_places p
                JOIN restaurant_records r ON r.place_id = p.place_id
                WHERE r.account_id = ?
                ORDER BY p.place_id
                """,
                (rs, row) -> rs.getObject("place_id", UUID.class),
                accountId);
        return loader.load(ids, accountId, PlaceViewLoader.RecordScope.OWN_ONLY);
    }

    /**
     * 기록을 저장하고 저장된 장소를 반환합니다. 작성자 프로필과 가게 정보는 외부 호출이라 호출하는 쪽이 트랜잭션 밖에서
     * 먼저 확인해 넘깁니다. 같은 장소의 빠른 기록은 함께 지웁니다.
     */
    @Transactional
    public PlaceView createRecord(
            UUID accountId, AuthorProfile author, PlaceInfo placeInfo, CreatePlaceRecordRequest request) {
        return saveRecord(accountId, author, placeInfo, request, null);
    }

    /**
     * 하트한 장소를 내 기록으로 바꿉니다. 직접 방문을 확인하지 않았으면 409로 거부하고, 하트는 원래 장소 ID(샘플 장소일 수
     * 있음)와 저장된 장소 ID에서 같은 트랜잭션으로 함께 지웁니다.
     */
    @Transactional
    public PlaceView convertLikeToRecord(
            UUID accountId,
            AuthorProfile author,
            PlaceInfo placeInfo,
            String sourcePlaceId,
            CreatePlaceRecordRequest request,
            boolean visitedConfirmed) {
        if (!visitedConfirmed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "직접 방문을 확인한 뒤 맛집 기록으로 등록해 주세요.");
        }
        PlaceView created = saveRecord(accountId, author, placeInfo, request, sourcePlaceId);
        likes.removeLikes(accountId, List.of(sourcePlaceId, created.id()));
        return created;
    }

    private PlaceView saveRecord(
            UUID accountId,
            AuthorProfile author,
            PlaceInfo placeInfo,
            CreatePlaceRecordRequest request,
            String sourcePlaceId) {
        contents.validatePhotoSize(request);
        if (!hasVisitBasis(accountId, request, sourcePlaceId)) {
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
        drafts.deleteDraft(accountId, request.providerPlaceId(), request.providerCode());
        likes.removeDislike(accountId, placeId.toString());
        return places.findById(placeId.toString(), accountId).orElseThrow();
    }

    /**
     * 위치를 다시 확인하지 않아도 되는, 이미 다녀온 근거가 있는 장소인지 봅니다. 이 장소의 내 기록(수정), 같은 장소의 빠른
     * 저장(빠른 저장 때 위치를 확인함), '입맛에 맞았어요' 하트(VISITED)입니다. 하트는 이 가게의 DB 장소 ID에 있거나,
     * 하트→기록 전환에서 보낸 샘플 장소 ID(제공자 ID가 없어 가게와 맞춰 볼 수 없음)에 있을 때만 셉니다. 다른 DB 장소의
     * 하트로 엉뚱한 가게를 등록하지 못하게 하려는 것입니다.
     */
    private boolean hasVisitBasis(UUID accountId, CreatePlaceRecordRequest request, String sourcePlaceId) {
        String provider = PlaceIdentifiers.providerCode(request.providerCode());
        String providerPlaceId = request.providerPlaceId();
        String sampleSourceId =
                sourcePlaceId != null && PlaceIdentifiers.uuidOrNull(sourcePlaceId) == null ? sourcePlaceId : "";
        return drafts.hasDraft(accountId, provider, providerPlaceId)
                || Boolean.TRUE.equals(jdbc.queryForObject(
                        """
                        SELECT EXISTS (
                            SELECT 1 FROM restaurant_places p
                            JOIN restaurant_records r ON r.place_id = p.place_id
                            WHERE p.provider_code = ? AND p.provider_place_id = ? AND r.account_id = ?
                        ) OR EXISTS (
                            SELECT 1 FROM user_place_likes l
                            WHERE l.account_id = ? AND l.save_origin = 'VISITED'
                              AND (l.place_id = ? OR l.place_id IN (
                                  SELECT p.place_id::text FROM restaurant_places p
                                  WHERE p.provider_code = ? AND p.provider_place_id = ?
                              ))
                        )
                        """,
                        Boolean.class,
                        provider,
                        providerPlaceId,
                        accountId,
                        accountId,
                        sampleSourceId,
                        provider,
                        providerPlaceId));
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
     * 다른 맛객도 함께 쓰는 가게 행(restaurant_places)과 하트는 그대로 둡니다. 지운 기록이 없으면 false입니다.
     */
    @Transactional
    public boolean deleteRecord(UUID accountId, String placeId) {
        UUID id = PlaceIdentifiers.uuidOrNull(placeId);
        if (id == null) return false;
        return jdbc.update("DELETE FROM restaurant_records WHERE place_id = ? AND account_id = ?", id, accountId) > 0;
    }

    /** 작성자 이름·캐릭터는 기록 시점의 커뮤니티 프로필 값으로 함께 저장합니다. */
    private UUID upsertRecord(UUID placeId, UUID accountId, AuthorProfile author, CreatePlaceRecordRequest request) {
        return jdbc.queryForObject(
                """
                INSERT INTO restaurant_records (
                    record_id, place_id, account_id, author_name, author_avatar_variant,
                    reason, visibility
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (account_id, place_id) DO UPDATE SET
                    author_name = EXCLUDED.author_name,
                    author_avatar_variant = EXCLUDED.author_avatar_variant,
                    reason = EXCLUDED.reason, visibility = EXCLUDED.visibility, upd_dt = now()
                RETURNING record_id
                """,
                UUID.class,
                UUID.randomUUID(),
                placeId,
                accountId,
                author.nickname().trim(),
                author.avatarVariant(),
                request.reason().trim(),
                request.visibility().name());
    }
}
