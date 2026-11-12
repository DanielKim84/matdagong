package kr.matdagong.place.recent;

import static kr.matdagong.place.catalog.PlaceModels.*;

import java.util.List;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.catalog.PlaceViewLoader;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 계정별로 최근 15일 안에 본 장소를 최대 30곳까지 기억합니다(DB user_recent_places 설명과 같은 기준). */
@Service
public class RecentPlaceService {
    private static final int RETENTION_DAYS = 15;
    private static final int MAX_RECENT_PLACES = 30;

    private final JdbcTemplate jdbc;
    private final PlaceViewLoader loader;

    public RecentPlaceService(JdbcTemplate jdbc, PlaceViewLoader loader) {
        this.jdbc = jdbc;
        this.loader = loader;
    }

    /**
     * 최근 15일간 본 장소를 마지막으로 본 순서로 반환합니다(PlaceViewLoader가 넘긴 순서를 지킴). 기간이 지난 행은 조건으로
     * 빼고, 삭제는 기록할 때 합니다.
     */
    @Transactional(readOnly = true)
    public List<PlaceView> findRecent(UUID accountId) {
        List<UUID> placeIds = jdbc.query(
                """
                SELECT place_id FROM user_recent_places
                WHERE account_id = ? AND viewed_at >= now() - make_interval(days => ?)
                ORDER BY viewed_at DESC LIMIT ?
                """,
                (rs, row) -> rs.getObject("place_id", UUID.class),
                accountId,
                RETENTION_DAYS,
                MAX_RECENT_PLACES);
        return loader.load(placeIds, accountId, PlaceViewLoader.RecordScope.PUBLIC_AND_OWN);
    }

    /** 있는 장소인지 확인한 뒤 최근 본 목록에 기록하고, 오래되거나 넘친 항목을 지웁니다. */
    @Transactional
    public void remember(UUID accountId, String placeIdValue) {
        UUID placeId = PlaceIdentifiers.uuidOrNull(placeIdValue);
        if (placeId == null || !exists(placeId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "최근 본 맛집을 찾을 수 없습니다.");
        }
        jdbc.update(
                """
                INSERT INTO user_recent_places(account_id, place_id, viewed_at)
                VALUES (?, ?, now())
                ON CONFLICT (account_id, place_id) DO UPDATE SET viewed_at = now()
                """,
                accountId,
                placeId);
        // 이 사람 것만 정리합니다. 다른 사람의 지난 행은 조회 조건이 이미 가리고, 그 사람이 다음에 볼 때 지워집니다.
        // 지난 행은 가장 오래된 행이라 "기간 지남"과 "최근 30곳 밖"을 한 번에 지워도 따로 지울 때와 남는 행이 같습니다.
        jdbc.update(
                """
                DELETE FROM user_recent_places
                WHERE account_id = ?
                  AND (viewed_at < now() - make_interval(days => ?)
                       OR place_id NOT IN (
                           SELECT place_id FROM user_recent_places
                           WHERE account_id = ? ORDER BY viewed_at DESC LIMIT ?
                       ))
                """,
                accountId,
                RETENTION_DAYS,
                accountId,
                MAX_RECENT_PLACES);
    }

    private boolean exists(UUID placeId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM restaurant_places WHERE place_id = ?)", Boolean.class, placeId));
    }
}
