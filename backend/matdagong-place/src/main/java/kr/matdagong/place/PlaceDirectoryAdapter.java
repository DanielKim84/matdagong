package kr.matdagong.place;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import kr.matdagong.common.module.PlaceDirectory;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.catalog.PlaceModels.RecordVisibility;
import kr.matdagong.place.trust.TasteTrustService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** 커뮤니티 모듈이 묻는 기록 정보(PlaceDirectory)를 장소 모듈 DB와 서비스로 답합니다. */
@Component
class PlaceDirectoryAdapter implements PlaceDirectory {
    private final JdbcTemplate jdbc;
    private final TasteTrustService trust;

    PlaceDirectoryAdapter(@PlaceDatabase JdbcTemplate jdbc, TasteTrustService trust) {
        this.jdbc = jdbc;
        this.trust = trust;
    }

    /** 맛집 등록 알림에는 장소 이름과 공개 여부만 필요해 본인 기록 한 줄만 읽습니다. 장소 ID 형식이 틀리면 없는 것으로 봅니다. */
    @Override
    public Optional<RecordedPlace> ownRecord(UUID accountId, String placeId) {
        UUID id = PlaceIdentifiers.uuidOrNull(placeId);
        if (id == null) return Optional.empty();
        return jdbc
                .query(
                        """
                        SELECT p.place_name, r.visibility FROM restaurant_records r
                        JOIN restaurant_places p ON p.place_id = r.place_id
                        WHERE r.place_id = ? AND r.account_id = ?
                        """,
                        (rs, row) -> new RecordedPlace(
                                id.toString(),
                                rs.getString("place_name"),
                                RecordVisibility.valueOf(rs.getString("visibility")) == RecordVisibility.PUBLIC),
                        id,
                        accountId)
                .stream()
                .findFirst();
    }

    @Override
    public Map<UUID, TrustStats> trustStats(UUID accountId) {
        return trust.statsFor(accountId).stream().collect(Collectors.toMap(TrustStats::accountId, Function.identity()));
    }
}
