package kr.matdagong.place.trust;

import static kr.matdagong.place.trust.TasteTrustModels.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 같은 맛집을 두고 나와 다른 계정이 남긴 반응을 모아 경험 신뢰의 재료를 셉니다.
 * 인정은 기록(공개·나만 보기)이고, 가볼 곳 하트는 아직 가 보지 않은 곳이라 세지 않습니다. 엇갈림은 한쪽의 인정과 다른 쪽의 별로였던 곳이 겹친 맛집입니다.
 */
@Service
public class TasteTrustService {
    private final JdbcTemplate jdbc;

    public TasteTrustService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<TasteTrustStats> statsFor(UUID accountId) {
        Map<UUID, Integer> tagMatches = tagMatchPercents(accountId);
        // 엇갈림은 두 방향(내가 인정하고 상대가 별로, 상대가 인정하고 내가 별로)을 모두 세고, 한쪽만 있는 계정도 FULL JOIN으로 남깁니다.
        // 다른 계정의 인정은 내가 인정했거나 별로였다고 남긴 장소(my_places)에서만 찾아, 전체 기록을 훑지 않고 장소 색인으로 좁힙니다.
        List<TasteTrustStats> stats = new ArrayList<>(jdbc.query(
                """
                WITH my_approvals AS (SELECT DISTINCT place_id FROM restaurant_records WHERE account_id = ?),
                my_dislikes AS (SELECT place_id FROM user_place_dislikes WHERE account_id = ?),
                my_places AS (SELECT place_id FROM my_approvals UNION SELECT place_id FROM my_dislikes),
                other_approvals AS (
                    SELECT DISTINCT account_id, place_id FROM restaurant_records
                    WHERE place_id IN (SELECT place_id FROM my_places) AND account_id <> ?
                ),
                agreed AS (
                    SELECT a.account_id, count(*) AS agreed_count
                    FROM other_approvals a
                    JOIN my_approvals m ON m.place_id = a.place_id
                    GROUP BY a.account_id
                ),
                conflicts AS (
                    SELECT account_id, count(*) AS conflict_count
                    FROM (
                        SELECT a.account_id FROM other_approvals a JOIN my_dislikes d ON d.place_id = a.place_id
                        UNION ALL
                        SELECT d.account_id FROM user_place_dislikes d JOIN my_approvals m ON m.place_id = d.place_id
                        WHERE d.account_id <> ?
                    ) conflict
                    GROUP BY account_id
                )
                SELECT COALESCE(g.account_id, c.account_id) AS account_id,
                       COALESCE(g.agreed_count, 0) AS agreed_count,
                       COALESCE(c.conflict_count, 0) AS conflict_count
                FROM agreed g
                FULL JOIN conflicts c ON c.account_id = g.account_id
                """,
                (rs, row) -> {
                    UUID otherId = rs.getObject("account_id", UUID.class);
                    return new TasteTrustStats(
                            otherId.toString(),
                            rs.getInt("agreed_count"),
                            rs.getInt("conflict_count"),
                            tagMatches.get(otherId));
                },
                accountId,
                accountId,
                accountId,
                accountId));
        stats.sort((left, right) -> left.accountId().compareTo(right.accountId()));
        return stats;
    }

    /**
     * 둘 다 기록한 맛집마다 "어떤 곳이었나요?"에서 고른 태그와 매장 정보가 얼마나 겹치는지(겹친 수 ÷ 합친 수) 구해 계정별로 평균합니다.
     * 둘 다 아무것도 고르지 않은 맛집은 비교할 수 없어 뺍니다.
     */
    private Map<UUID, Integer> tagMatchPercents(UUID accountId) {
        Map<UUID, Map<UUID, Set<String>>> labelsByPlace = new HashMap<>();
        jdbc.query(
                """
                SELECT r.place_id, r.account_id, label.name
                FROM restaurant_records r
                LEFT JOIN (
                    SELECT record_id, tag_name AS name FROM restaurant_record_tags
                    UNION ALL
                    SELECT record_id, condition_name FROM restaurant_record_visit_conditions
                ) label ON label.record_id = r.record_id
                WHERE r.place_id IN (SELECT place_id FROM restaurant_records WHERE account_id = ?)
                """,
                rs -> {
                    Set<String> labels = labelsByPlace
                            .computeIfAbsent(rs.getObject("place_id", UUID.class), key -> new HashMap<>())
                            .computeIfAbsent(rs.getObject("account_id", UUID.class), key -> new HashSet<>());
                    String name = rs.getString("name");
                    if (name != null) labels.add(name);
                },
                accountId);

        Map<UUID, List<Double>> similarities = new HashMap<>();
        labelsByPlace.values().forEach(byAccount -> {
            Set<String> mine = byAccount.get(accountId);
            byAccount.forEach((otherId, theirs) -> {
                if (otherId.equals(accountId)) return;
                Set<String> union = new HashSet<>(mine);
                union.addAll(theirs);
                if (union.isEmpty()) return;
                Set<String> shared = new HashSet<>(mine);
                shared.retainAll(theirs);
                similarities
                        .computeIfAbsent(otherId, key -> new ArrayList<>())
                        .add((double) shared.size() / union.size());
            });
        });

        Map<UUID, Integer> percents = new HashMap<>();
        similarities.forEach((otherId, values) -> percents.put(otherId, (int) Math.round(
                values.stream().mapToDouble(Double::doubleValue).average().orElse(0) * 100)));
        return percents;
    }
}
