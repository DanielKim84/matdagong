package kr.matdagong.place.like;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.location.DeviceLocation;
import kr.matdagong.place.location.NearbyPlaceGuard;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 계정별 하트(가볼 곳)와 별로였던 곳을 저장합니다. 한 장소는 하트와 별로였던 곳 중 하나만 되고, 내 기록이 있는 장소는
 * 둘 다 남기지 않으므로 기록을 남길 때도(PlaceRecordService) 이 목록을 갱신합니다.
 */
@Service
public class PlaceLikeService {
    private static final String INVALID_PLACE = "저장할 맛집을 확인해 주세요.";
    private static final String VISIT_PROOF_REQUIRED =
            "직접 다녀온 곳만 별로였다고 남길 수 있어요. 가게 근처(" + NearbyPlaceGuard.MAX_VISIT_DISTANCE_LABEL + ")에서 다시 골라 주세요.";

    private final JdbcTemplate jdbc;
    private final NearbyPlaceGuard nearby;

    public PlaceLikeService(JdbcTemplate jdbc, NearbyPlaceGuard nearby) {
        this.jdbc = jdbc;
        this.nearby = nearby;
    }

    @Transactional(readOnly = true)
    public List<String> likedPlaceIds(UUID accountId) {
        return placeIds("SELECT place_id FROM user_place_likes WHERE account_id = ? ORDER BY reg_dt DESC", accountId);
    }

    @Transactional(readOnly = true)
    public List<String> dislikedPlaceIds(UUID accountId) {
        return placeIds(
                "SELECT place_id FROM user_place_dislikes WHERE account_id = ? ORDER BY reg_dt DESC", accountId);
    }

    /**
     * 하트를 가볼 곳으로 저장하거나 지웁니다. 가볼 곳은 방문 근거가 필요 없고, 같은 장소의 별로였던 곳 표시는 지웁니다.
     * 이미 하트한 곳은 그대로 둡니다. 없는 장소는 저장하지 않습니다(400).
     */
    @Transactional
    public void setLiked(UUID accountId, String placeIdValue, boolean liked) {
        UUID placeId = requirePlaceId(placeIdValue);
        if (!liked) {
            removeLike(accountId, placeId);
            return;
        }
        if (hasOwnRecord(accountId, placeId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "내가 등록한 맛집은 내 맛집으로 중복 저장할 수 없습니다.");
        }
        removeDislike(accountId, placeId);
        jdbc.update(
                "INSERT INTO user_place_likes(account_id, place_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                accountId,
                placeId);
    }

    /**
     * 다녀왔지만 별로였던 곳으로 남기거나 되돌립니다. 남길 때는 방문 근거가 있거나 기기가 지금 가게 1km 안이어야 하고,
     * 같은 장소의 하트는 지웁니다. 없는 장소는 저장하지 않습니다(400).
     */
    @Transactional
    public void setDisliked(UUID accountId, String placeIdValue, boolean disliked, DeviceLocation device) {
        UUID placeId = requirePlaceId(placeIdValue);
        if (!disliked) {
            removeDislike(accountId, placeId);
            return;
        }
        if (hasOwnRecord(accountId, placeId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "내가 등록한 맛집은 별로였던 곳으로 남길 수 없습니다.");
        }
        requireVisitProof(accountId, placeId, device);
        removeLike(accountId, placeId);
        jdbc.update(
                "INSERT INTO user_place_dislikes(account_id, place_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                accountId,
                placeId);
    }

    /** 다시 하트하거나 기록을 남긴 장소는 더 이상 별로였던 곳이 아니므로 표시를 지웁니다. */
    @Transactional
    public void removeDislike(UUID accountId, UUID placeId) {
        jdbc.update("DELETE FROM user_place_dislikes WHERE account_id = ? AND place_id = ?", accountId, placeId);
    }

    /** 하트를 풀거나, 별로였던 곳·내 기록으로 남긴 장소는 가볼 곳에서 뺍니다. */
    @Transactional
    public void removeLike(UUID accountId, UUID placeId) {
        jdbc.update("DELETE FROM user_place_likes WHERE account_id = ? AND place_id = ?", accountId, placeId);
    }

    private List<String> placeIds(String sql, Object... args) {
        return jdbc.query(sql, (rs, row) -> rs.getObject("place_id", UUID.class).toString(), args);
    }

    /**
     * 화면도 거리를 먼저 확인하지만, 요청을 그대로 믿지 않도록 서버가 다시 확인합니다. 방문 근거는 다녀온 곳(빠른 저장·기록이
     * 늘 함께 남김)과 이미 남긴 별로였던 곳입니다. 화면 useMyPlaces의 visitProofPlaceIds도 같은 두 목록을 합쳐 씁니다.
     */
    private void requireVisitProof(UUID accountId, UUID placeId, DeviceLocation device) {
        if (nearby.isNearby(device, placeId)) return;
        boolean hasProof = Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (SELECT 1 FROM user_place_visits WHERE account_id = ? AND place_id = ?)
                    OR EXISTS (SELECT 1 FROM user_place_dislikes WHERE account_id = ? AND place_id = ?)
                """,
                Boolean.class,
                accountId,
                placeId,
                accountId,
                placeId));
        if (!hasProof) throw new ResponseStatusException(HttpStatus.CONFLICT, VISIT_PROOF_REQUIRED);
    }

    private static UUID requirePlaceId(String value) {
        UUID placeId = PlaceIdentifiers.uuidOrNull(value);
        if (placeId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_PLACE);
        return placeId;
    }

    /** 장소가 있는지와 그 장소에 내 기록이 있는지를 한 번에 봅니다. 없는 장소면 400입니다. */
    private boolean hasOwnRecord(UUID accountId, UUID placeId) {
        Optional<Boolean> ownRecord = jdbc
                .query(
                        """
                        SELECT EXISTS (SELECT 1 FROM restaurant_records r WHERE r.account_id = ? AND r.place_id = p.place_id)
                        FROM restaurant_places p WHERE p.place_id = ?
                        """,
                        (rs, row) -> rs.getBoolean(1),
                        accountId,
                        placeId)
                .stream()
                .findFirst();
        return ownRecord.orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_PLACE));
    }
}
