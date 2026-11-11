package kr.matdagong.place.visit;

import java.util.List;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 계정별 다녀온 곳(user_place_visits)을 저장합니다. 빠른 저장(가게 1km 안에서만 저장됨)이나 기록을 남기면 다녀온 곳이 되고,
 * 기록을 지워도 남습니다. 다녀온 곳은 위치 확인 없이 언제든 기록할 수 있습니다(PlaceRecordService가 확인). 빠른 저장으로만
 * 다녀온 곳은 그 빠른 저장을 지우면 함께 빠집니다.
 */
@Service
public class PlaceVisitService {
    /**
     * 새로 남기는 다녀온 근거입니다. DB의 visit_source에는 V12가 예전 '다녀왔어요' 하트에서 옮긴 HEART도 있지만, 지금은
     * 새로 만들지 않아 여기에 두지 않습니다.
     */
    public enum VisitSource {
        QUICK_SAVE,
        RECORD
    }

    private final JdbcTemplate jdbc;

    public PlaceVisitService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 내 지도의 다녀온 곳 목록입니다. 처음 다녀온 곳이 된 시각의 최신순입니다. */
    @Transactional(readOnly = true)
    public List<String> visitedPlaceIds(UUID accountId) {
        return jdbc.query(
                "SELECT place_id FROM user_place_visits WHERE account_id = ? ORDER BY reg_dt DESC",
                (rs, row) -> rs.getObject("place_id", UUID.class).toString(),
                accountId);
    }

    /**
     * 다녀온 곳으로 남깁니다. 이미 있으면 기록(RECORD)일 때만 근거를 바꿉니다. 기록이 가장 확실한 근거라, 빠른 저장으로
     * 다녀온 곳이 된 가게도 기록하면 빠른 저장을 지워도 남게 하고, 반대로 빠른 저장이 RECORD·HEART를 덮지 않게 합니다.
     * reg_dt는 처음 다녀온 시각으로 그대로 둡니다.
     */
    @Transactional
    public void markVisited(UUID accountId, UUID placeId, VisitSource source) {
        jdbc.update(
                """
                INSERT INTO user_place_visits (account_id, place_id, visit_source)
                VALUES (?, ?, ?)
                ON CONFLICT (account_id, place_id) DO UPDATE SET visit_source = EXCLUDED.visit_source
                WHERE EXCLUDED.visit_source = 'RECORD'
                """,
                accountId,
                placeId,
                source.name());
    }

    /** 사용자가 빠른 저장을 지우면, 빠른 저장으로만 다녀온 곳이 된 그 가게를 다녀온 곳에서 뺍니다(RECORD·HEART는 남김). */
    @Transactional
    public void forgetQuickSave(UUID accountId, String providerCode, String providerPlaceId) {
        jdbc.update(
                """
                DELETE FROM user_place_visits v
                USING restaurant_places p
                WHERE v.account_id = ? AND v.visit_source = 'QUICK_SAVE' AND v.place_id = p.place_id
                  AND p.provider_code = ? AND p.provider_place_id = ?
                """,
                accountId,
                PlaceIdentifiers.providerCode(providerCode),
                providerPlaceId);
    }
}
