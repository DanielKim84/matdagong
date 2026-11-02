package kr.matdagong.place.like;

import java.util.List;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 계정별 하트(내 맛집) 목록을 저장합니다. 내 기록이 있는 장소는 하트로 중복 저장하지 않으므로,
 * 기록을 하트로 옮기거나 하트를 기록으로 바꾸는 처리도 이 목록을 갱신합니다.
 */
@Service
public class PlaceLikeService {
    private final JdbcTemplate jdbc;

    public PlaceLikeService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<String> likedPlaceIds(UUID accountId) {
        return jdbc.query(
                "SELECT place_id FROM user_place_likes WHERE account_id = ? ORDER BY reg_dt DESC",
                (rs, row) -> rs.getString("place_id"),
                accountId);
    }

    /** 직접 작성한 방문 기록을 내 맛집으로 옮긴 항목만 다시 기록 전환 대상으로 반환합니다. */
    @Transactional(readOnly = true)
    public List<String> visitedLikedPlaceIds(UUID accountId) {
        return jdbc.query(
                "SELECT place_id FROM user_place_likes WHERE account_id = ? AND save_origin = 'VISITED' ORDER BY reg_dt DESC",
                (rs, row) -> rs.getString("place_id"),
                accountId);
    }

    @Transactional
    public void setLiked(UUID accountId, String placeId, boolean liked) {
        if (!PlaceIdentifiers.isValidPlaceId(placeId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "저장할 맛집을 확인해 주세요.");
        }
        if (!liked) {
            jdbc.update("DELETE FROM user_place_likes WHERE account_id = ? AND place_id = ?", accountId, placeId);
            return;
        }
        // 샘플 장소 ID는 UUID가 아니라 내 기록이 있을 수 없으므로 확인 없이 저장합니다.
        UUID databasePlaceId = PlaceIdentifiers.uuidOrNull(placeId);
        if (databasePlaceId != null && hasOwnRecord(accountId, databasePlaceId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "내가 등록한 맛집은 내 맛집으로 중복 저장할 수 없습니다.");
        }
        jdbc.update(
                "INSERT INTO user_place_likes(account_id, place_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                accountId,
                placeId);
    }

    /** 내 기록을 지우고 같은 장소를 하트로 옮길 때 씁니다. 다시 기록으로 바꿀 수 있도록 VISITED로 표시합니다. */
    @Transactional
    public void saveVisited(UUID accountId, UUID placeId) {
        jdbc.update(
                """
                INSERT INTO user_place_likes(account_id, place_id, save_origin)
                VALUES (?, ?, 'VISITED')
                ON CONFLICT (account_id, place_id)
                DO UPDATE SET save_origin = 'VISITED'
                """,
                accountId,
                placeId.toString());
    }

    @Transactional
    public void removeLikes(UUID accountId, List<String> placeIds) {
        jdbc.update(
                "DELETE FROM user_place_likes WHERE account_id = ? AND place_id = ANY(?::text[])",
                accountId,
                placeIds.toArray(String[]::new));
    }

    private boolean hasOwnRecord(UUID accountId, UUID placeId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM restaurant_records WHERE account_id = ? AND place_id = ?)",
                Boolean.class,
                accountId,
                placeId));
    }
}
