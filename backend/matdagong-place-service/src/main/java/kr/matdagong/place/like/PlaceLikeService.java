package kr.matdagong.place.like;

import static kr.matdagong.place.like.PlaceLikeModels.*;

import java.util.List;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 계정별 하트(내 맛집)와 별로였던 곳을 저장합니다. 내 기록이 있는 장소는 하트·별로였던 곳으로 중복 저장하지 않으므로,
 * 하트를 기록으로 바꾸거나 기록을 남길 때도 이 목록을 갱신합니다. 한 장소는 하트와 별로였던 곳 중 하나만 됩니다.
 */
@Service
public class PlaceLikeService {
    private static final String INVALID_PLACE = "저장할 맛집을 확인해 주세요.";
    private static final String VISIT_PROOF_REQUIRED = "이 가게에서 빠른 저장이나 맛집 기록을 남긴 뒤에 다녀온 맛을 고를 수 있어요.";
    private static final String VISIT_PROOFS_SQL =
            """
            SELECT place_id FROM user_place_likes WHERE account_id = ? AND save_origin = 'VISITED'
            UNION
            SELECT place_id FROM user_place_dislikes WHERE account_id = ?
            UNION
            SELECT p.place_id::text
            FROM place_quick_drafts d
            JOIN restaurant_places p ON p.provider_code = d.provider_code AND p.provider_place_id = d.provider_place_id
            WHERE d.account_id = ?
            """;

    private final JdbcTemplate jdbc;

    public PlaceLikeService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<String> likedPlaceIds(UUID accountId) {
        return placeIds("SELECT place_id FROM user_place_likes WHERE account_id = ? ORDER BY reg_dt DESC", accountId);
    }

    /** 직접 다녀와 입맛에 맞았던 하트(VISITED)만 반환합니다. 이 장소는 방문 확인 없이 기록으로 바꿀 수 있습니다. */
    @Transactional(readOnly = true)
    public List<String> visitedLikedPlaceIds(UUID accountId) {
        return placeIds(
                "SELECT place_id FROM user_place_likes WHERE account_id = ? AND save_origin = 'VISITED' ORDER BY reg_dt DESC",
                accountId);
    }

    @Transactional(readOnly = true)
    public List<String> dislikedPlaceIds(UUID accountId) {
        return placeIds(
                "SELECT place_id FROM user_place_dislikes WHERE account_id = ? ORDER BY reg_dt DESC", accountId);
    }

    /**
     * '입맛에 맞았어요'·'별로였어요'를 고를 수 있는, 직접 들른 근거가 있는 장소입니다. 근거는 빠른 저장(서버가 기기 위치 1km
     * 안에서만 저장하게 함, NearbyPlaceGuard), '입맛에 맞았어요' 하트(VISITED), 이미 남긴 별로였던 곳입니다. 내 기록이 있는 장소는 하트를 쓰지 않아
     * 넣지 않습니다.
     */
    @Transactional(readOnly = true)
    public List<String> visitProofPlaceIds(UUID accountId) {
        return placeIds(VISIT_PROOFS_SQL, accountId, accountId, accountId);
    }

    /** 하트를 저장하거나 지웁니다. 이미 하트한 장소에 다시 저장하면 '가 보고 싶어요'와 '입맛에 맞았어요' 사이를 바꿉니다. */
    @Transactional
    public void setLiked(UUID accountId, String placeId, boolean liked, boolean visited) {
        requireValidPlaceId(placeId);
        if (!liked) {
            jdbc.update("DELETE FROM user_place_likes WHERE account_id = ? AND place_id = ?", accountId, placeId);
            return;
        }
        if (hasOwnRecord(accountId, placeId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "내가 등록한 맛집은 내 맛집으로 중복 저장할 수 없습니다.");
        }
        if (visited) requireVisitProof(accountId, placeId);
        removeDislike(accountId, placeId);
        jdbc.update(
                """
                INSERT INTO user_place_likes(account_id, place_id, save_origin)
                VALUES (?, ?, ?)
                ON CONFLICT (account_id, place_id)
                DO UPDATE SET save_origin = EXCLUDED.save_origin
                """,
                accountId,
                placeId,
                (visited ? SaveOrigin.VISITED : SaveOrigin.LIKED).name());
    }

    /** 다녀왔지만 별로였던 곳으로 남기거나 되돌립니다. 남기면 같은 장소의 하트는 지웁니다. */
    @Transactional
    public void setDisliked(UUID accountId, String placeId, boolean disliked) {
        requireValidPlaceId(placeId);
        if (!disliked) {
            removeDislike(accountId, placeId);
            return;
        }
        if (hasOwnRecord(accountId, placeId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "내가 등록한 맛집은 별로였던 곳으로 남길 수 없습니다.");
        }
        requireVisitProof(accountId, placeId);
        jdbc.update("DELETE FROM user_place_likes WHERE account_id = ? AND place_id = ?", accountId, placeId);
        jdbc.update(
                "INSERT INTO user_place_dislikes(account_id, place_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                accountId,
                placeId);
    }

    @Transactional
    public void removeLikes(UUID accountId, List<String> placeIds) {
        jdbc.update(
                "DELETE FROM user_place_likes WHERE account_id = ? AND place_id = ANY(?::text[])",
                accountId,
                placeIds.toArray(String[]::new));
    }

    /** 기록을 남긴 장소는 입맛에 맞았던 곳이므로 별로였던 곳 표시를 지웁니다. */
    @Transactional
    public void removeDislike(UUID accountId, String placeId) {
        jdbc.update("DELETE FROM user_place_dislikes WHERE account_id = ? AND place_id = ?", accountId, placeId);
    }

    private List<String> placeIds(String sql, Object... args) {
        return jdbc.query(sql, (rs, row) -> rs.getString("place_id"), args);
    }

    private void requireVisitProof(UUID accountId, String placeId) {
        boolean hasProof = Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM (" + VISIT_PROOFS_SQL + ") proof WHERE place_id = ?)",
                Boolean.class,
                accountId,
                accountId,
                accountId,
                placeId));
        if (!hasProof) throw new ResponseStatusException(HttpStatus.CONFLICT, VISIT_PROOF_REQUIRED);
    }

    private static void requireValidPlaceId(String placeId) {
        if (!PlaceIdentifiers.isValidPlaceId(placeId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_PLACE);
        }
    }

    /** 샘플 장소 ID는 UUID가 아니라 내 기록이 있을 수 없으므로 확인하지 않습니다. */
    private boolean hasOwnRecord(UUID accountId, String placeId) {
        UUID databasePlaceId = PlaceIdentifiers.uuidOrNull(placeId);
        return databasePlaceId != null
                && Boolean.TRUE.equals(jdbc.queryForObject(
                        "SELECT EXISTS (SELECT 1 FROM restaurant_records WHERE account_id = ? AND place_id = ?)",
                        Boolean.class,
                        accountId,
                        databasePlaceId));
    }
}
