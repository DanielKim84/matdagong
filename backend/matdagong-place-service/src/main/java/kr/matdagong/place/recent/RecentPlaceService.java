package kr.matdagong.place.recent;

import static kr.matdagong.place.catalog.PlaceModels.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.catalog.PlaceQueryService;
import kr.matdagong.place.catalog.PlaceViewLoader;
import kr.matdagong.place.catalog.SamplePlaceCatalog;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 계정별로 최근 15일 안에 본 장소를 최대 30곳까지 기억합니다. */
@Service
public class RecentPlaceService {
    private static final int RETENTION_DAYS = 15;
    private static final int MAX_RECENT_PLACES = 30;

    private final JdbcTemplate jdbc;
    private final SamplePlaceCatalog samples;
    private final PlaceViewLoader loader;
    private final PlaceQueryService places;

    public RecentPlaceService(
            JdbcTemplate jdbc, SamplePlaceCatalog samples, PlaceViewLoader loader, PlaceQueryService places) {
        this.jdbc = jdbc;
        this.samples = samples;
        this.loader = loader;
        this.places = places;
    }

    /** 최근 15일간 본 장소를 마지막 방문 순서로 반환합니다. 기간이 지난 행은 조건으로 빼고, 삭제는 기록할 때 합니다. */
    @Transactional(readOnly = true)
    public List<PlaceView> findRecent(UUID accountId) {
        List<String> ids = jdbc.query(
                """
                SELECT place_id FROM user_recent_places
                WHERE account_id = ? AND viewed_at >= now() - make_interval(days => ?)
                ORDER BY viewed_at DESC LIMIT ?
                """,
                (rs, row) -> rs.getString("place_id"),
                accountId,
                RETENTION_DAYS,
                MAX_RECENT_PLACES);
        // 샘플 장소와 DB 장소가 섞여 있으므로 DB 장소만 한 번에 불러온 뒤 최근 본 순서대로 다시 맞춥니다.
        List<UUID> databaseIds = ids.stream()
                .filter(id -> samples.findById(id) == null)
                .map(PlaceIdentifiers::uuidOrNull)
                .filter(Objects::nonNull)
                .toList();
        Map<String, PlaceView> databasePlaces = new LinkedHashMap<>();
        loader.load(databaseIds, accountId, PlaceViewLoader.RecordScope.PUBLIC_AND_OWN)
                .forEach(place -> databasePlaces.put(place.id(), place));
        return ids.stream()
                .map(id -> Objects.requireNonNullElseGet(samples.findById(id), () -> databasePlaces.get(id)))
                .filter(Objects::nonNull)
                .toList();
    }

    /** 장소가 현재 사용자에게 조회 가능한지 확인한 뒤 최근 본 목록에 기록하고, 오래되거나 넘친 항목을 지웁니다. */
    @Transactional
    public void remember(UUID accountId, String placeId) {
        if (!PlaceIdentifiers.isValidPlaceId(placeId)
                || places.findById(placeId, accountId).isEmpty()) {
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
        jdbc.update(
                "DELETE FROM user_recent_places WHERE account_id = ? AND viewed_at < now() - make_interval(days => ?)",
                accountId,
                RETENTION_DAYS);
        jdbc.update(
                """
                DELETE FROM user_recent_places
                WHERE account_id = ? AND place_id NOT IN (
                    SELECT place_id FROM user_recent_places
                    WHERE account_id = ? ORDER BY viewed_at DESC LIMIT ?
                )
                """,
                accountId,
                accountId,
                MAX_RECENT_PLACES);
    }
}
