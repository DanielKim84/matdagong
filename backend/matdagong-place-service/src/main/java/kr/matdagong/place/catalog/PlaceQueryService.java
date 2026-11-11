package kr.matdagong.place.catalog;

import static kr.matdagong.place.catalog.PlaceModels.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import kr.matdagong.common.jdbc.LikePatterns;
import kr.matdagong.place.profile.HiddenTasters;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** DB 장소를 검색·조회합니다. 비공개 기록은 조회하는 사람 본인의 것만 담습니다. */
@Service
public class PlaceQueryService {
    private final JdbcTemplate jdbc;
    private final PlaceViewLoader loader;
    private final HiddenTasters hiddenTasters;

    public PlaceQueryService(JdbcTemplate jdbc, PlaceViewLoader loader, HiddenTasters hiddenTasters) {
        this.jdbc = jdbc;
        this.loader = loader;
        this.hiddenTasters = hiddenTasters;
    }

    /**
     * 공개 기록이 있거나 내가 하트했거나 다녀온 장소를 반환합니다. 기록이 없는 가볼 곳·다녀온 곳은 저장한 사람의 목록에만
     * 나옵니다. 목록에는 공개 기록만 담고, 내 비공개 기록은 상세·내 기록 조회에서만 보여줍니다.
     */
    @Transactional(readOnly = true)
    public List<PlaceView> findAll(String query, UUID viewerId) {
        String filter = query == null ? "" : query.trim();
        // 검색어의 %, _ 는 글자 그대로 찾습니다.
        String pattern = LikePatterns.contains(filter);
        List<UUID> ids = jdbc.query(
                """
                SELECT p.place_id
                FROM restaurant_places p
                WHERE (EXISTS (SELECT 1 FROM restaurant_records r
                               WHERE r.place_id = p.place_id AND r.visibility = 'PUBLIC'
                                 AND NOT (r.account_id = ANY(?::uuid[])))
                       OR EXISTS (SELECT 1 FROM user_place_likes l WHERE l.account_id = ? AND l.place_id = p.place_id)
                       OR EXISTS (SELECT 1 FROM user_place_visits v WHERE v.account_id = ? AND v.place_id = p.place_id))
                  AND (? = '' OR p.place_name ILIKE ? ESCAPE '\\'
                       OR p.category ILIKE ? ESCAPE '\\' OR p.address ILIKE ? ESCAPE '\\')
                ORDER BY p.place_id
                """,
                (rs, row) -> rs.getObject("place_id", UUID.class),
                hiddenTasters.idsExcept(viewerId),
                viewerId,
                viewerId,
                filter,
                pattern,
                pattern,
                pattern);
        return loader.load(ids, viewerId, PlaceViewLoader.RecordScope.PUBLIC_ONLY);
    }

    /** 주소 경로로 받은 장소 ID로 찾습니다. UUID가 아닌 ID는 없는 장소입니다. */
    @Transactional(readOnly = true)
    public Optional<PlaceView> findById(String id, UUID viewerId) {
        UUID placeId = PlaceIdentifiers.uuidOrNull(id);
        return placeId == null ? Optional.empty() : findById(placeId, viewerId);
    }

    /** 장소 하나를 공개 기록과 내 기록을 담아 반환합니다. */
    @Transactional(readOnly = true)
    public Optional<PlaceView> findById(UUID placeId, UUID viewerId) {
        return loader.load(List.of(placeId), viewerId, PlaceViewLoader.RecordScope.PUBLIC_AND_OWN).stream()
                .findFirst();
    }
}
