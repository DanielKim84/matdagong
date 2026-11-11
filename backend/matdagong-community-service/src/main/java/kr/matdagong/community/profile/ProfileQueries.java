package kr.matdagong.community.profile;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import kr.matdagong.common.jdbc.JdbcArrays;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 여러 기능(프로필·구독·신고·알림·맛객 목록)이 user_profiles를 같은 방식으로 읽도록 모은 조회와 SQL 조각입니다.
 * 트랜잭션은 부르는 Service가 엽니다.
 */
public final class ProfileQueries {
    /**
     * 배경 사진 ID 배열(sort_no 순) 칼럼입니다. 프로필 테이블 별칭이 p인 SELECT 목록에 넣고 {@link #coverUrls}로 읽습니다.
     */
    public static final String COVER_PHOTO_IDS =
            """
            ARRAY(
                SELECT c.photo_id FROM user_profile_cover_photos c
                WHERE c.account_id = p.account_id ORDER BY c.sort_no
            ) AS cover_photo_ids""";

    private ProfileQueries() {}

    /**
     * 신고가 쌓여 자동으로 가려졌는지 보는 조건입니다. accountColumn은 계정 ID 칼럼(예: p.account_id)으로, 코드의 고정 이름만
     * 넘깁니다.
     */
    public static String hiddenByReports(String accountColumn) {
        return "EXISTS (SELECT 1 FROM taster_moderations m WHERE m.account_id = " + accountColumn
                + " AND m.hidden_at IS NOT NULL)";
    }

    /** {@link #COVER_PHOTO_IDS} 칼럼을 같은 순서의 배경 사진 주소로 읽습니다. */
    public static List<String> coverUrls(ResultSet rs, UUID accountId) throws SQLException {
        return ProfileMediaUrls.coverPhotos(accountId, JdbcArrays.uuids(rs, "cover_photo_ids"));
    }

    public static boolean exists(JdbcTemplate jdbc, UUID accountId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE account_id = ?)", Boolean.class, accountId));
    }

    /** 프로필 행을 트랜잭션 끝까지 잠급니다. 같은 계정의 동시 요청을 차례로 처리할 때 씁니다. 프로필이 없으면 false입니다. */
    public static boolean lock(JdbcTemplate jdbc, UUID accountId) {
        return !jdbc.queryForList(
                        "SELECT account_id FROM user_profiles WHERE account_id = ? FOR UPDATE", UUID.class, accountId)
                .isEmpty();
    }

    public static Optional<String> nickname(JdbcTemplate jdbc, UUID accountId) {
        return jdbc
                .queryForList("SELECT nickname FROM user_profiles WHERE account_id = ?", String.class, accountId)
                .stream()
                .findFirst();
    }
}
