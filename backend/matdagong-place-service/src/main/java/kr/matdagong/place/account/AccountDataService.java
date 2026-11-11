package kr.matdagong.place.account;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 한 계정이 장소 서비스에 남긴 데이터를 한 트랜잭션에서 모두 지웁니다(맛다공 탈퇴).
 * 기록의 메뉴·태그·방문 조건·사진은 ON DELETE CASCADE로 함께 지워지고, 여러 맛객이 함께 쓰는 가게 행은 남깁니다.
 * 이미 지워졌어도 오류 없이 끝나므로 탈퇴를 다시 시도해도 됩니다.
 */
@Service
public class AccountDataService {
    /** account_id 칸으로 계정 데이터를 담는 테이블. 새 계정별 테이블을 만들면 여기에도 더합니다. */
    private static final List<String> ACCOUNT_TABLES = List.of(
            "restaurant_records",
            "user_place_likes",
            "user_place_dislikes",
            "user_place_visits",
            "user_recent_places",
            "place_quick_drafts",
            "place_reports");

    private final JdbcTemplate jdbc;

    public AccountDataService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void deleteAll(UUID accountId) {
        ACCOUNT_TABLES.forEach(table -> jdbc.update("DELETE FROM " + table + " WHERE account_id = ?", accountId));
    }
}
