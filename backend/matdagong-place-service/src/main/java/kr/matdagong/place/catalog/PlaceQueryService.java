package kr.matdagong.place.catalog;

import static kr.matdagong.place.catalog.PlaceModels.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 샘플 장소와 DB 장소를 함께 검색·조회합니다. 비공개 기록은 조회하는 사람 본인의 것만 담습니다. */
@Service
public class PlaceQueryService {
    private final JdbcTemplate jdbc;
    private final SamplePlaceCatalog samples;
    private final PlaceViewLoader loader;

    public PlaceQueryService(JdbcTemplate jdbc, SamplePlaceCatalog samples, PlaceViewLoader loader) {
        this.jdbc = jdbc;
        this.samples = samples;
        this.loader = loader;
    }

    /**
     * 샘플 장소와, 공개 기록이 있거나 내가 하트로 저장한 DB 장소를 함께 반환합니다.
     * 목록에는 공개 기록만 담고, 내 비공개 기록은 상세·내 기록 조회에서만 보여줍니다.
     */
    @Transactional(readOnly = true)
    public List<PlaceView> findAll(String query, UUID viewerId) {
        Map<String, PlaceView> results = new LinkedHashMap<>();
        samples.findAll(query).forEach(place -> results.put(place.id(), place));
        String filter = query == null ? "" : query.trim();
        List<UUID> ids = jdbc.query(
                """
                SELECT DISTINCT p.place_id
                FROM restaurant_places p
                WHERE (EXISTS (SELECT 1 FROM restaurant_records r
                               WHERE r.place_id = p.place_id AND r.visibility = 'PUBLIC')
                       OR EXISTS (SELECT 1 FROM user_place_likes l
                                  WHERE l.place_id = p.place_id::text AND l.account_id = ?))
                  AND (? = '' OR p.place_name ILIKE '%' || ? || '%'
                       OR p.category ILIKE '%' || ? || '%' OR p.address ILIKE '%' || ? || '%')
                ORDER BY p.place_id
                """,
                (rs, row) -> rs.getObject("place_id", UUID.class), viewerId, filter, filter, filter, filter);
        loader.load(ids, viewerId, PlaceViewLoader.RecordScope.PUBLIC_ONLY)
                .forEach(place -> results.put(place.id(), place));
        return List.copyOf(results.values());
    }

    /** 샘플 장소 또는 DB 장소 하나를 공개 기록과 내 기록을 담아 반환합니다. */
    @Transactional(readOnly = true)
    public Optional<PlaceView> findById(String id, UUID viewerId) {
        PlaceView sample = samples.findById(id);
        if (sample != null) return Optional.of(sample);
        UUID placeId = PlaceIdentifiers.uuidOrNull(id);
        if (placeId == null) return Optional.empty();
        return loader.load(List.of(placeId), viewerId, PlaceViewLoader.RecordScope.PUBLIC_AND_OWN).stream()
                .findFirst();
    }
}
