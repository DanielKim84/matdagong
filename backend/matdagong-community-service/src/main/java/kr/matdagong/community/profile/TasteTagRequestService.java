package kr.matdagong.community.profile;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 태그와 매장 이용 정보 제안을 DB 검토 대기열에 저장하고 사용자별 처리 이력을 제공합니다. */
@Service
public class TasteTagRequestService {
    private final JdbcTemplate jdbc;

    public TasteTagRequestService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public RequestView create(UUID accountId, String requestedType, String requestedName, String tagGroup, String reason) {
        String requestType = requestedType == null || requestedType.isBlank() ? "TAG" : requestedType;
        if (!requestType.equals("TAG") && !requestType.equals("PLACE_INFO")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제안 종류를 확인해 주세요.");
        }
        // 매장 이용 정보 제안은 화면이 보낸 그룹과 관계없이 방문 조건(VISIT) 검토 대상으로 분류합니다.
        if (requestType.equals("PLACE_INFO")) tagGroup = "VISIT";
        String name = requestedName.strip().replaceAll("\\s+", " ");
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "추가할 태그명을 입력해 주세요.");
        }
        Integer profileCount = jdbc.queryForObject(
                "SELECT count(*) FROM user_profiles WHERE account_id = ?", Integer.class, accountId);
        if (profileCount == null || profileCount == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "프로필을 먼저 등록해 주세요.");
        }
        Integer existingCount = requestType.equals("TAG") ? jdbc.queryForObject(
                "SELECT count(*) FROM taste_tags WHERE lower(tag_name) = lower(?)", Integer.class, name) : 0;
        if (existingCount != null && existingCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 선택 목록에 있는 태그예요.");
        }

        try {
            return jdbc.queryForObject("""
                    INSERT INTO taste_tag_requests (request_id, account_id, request_type, tag_name, tag_group, request_rsn)
                    VALUES (?, ?, ?, ?, ?, ?)
                    RETURNING request_id, request_type, tag_name, tag_group, request_rsn, request_st,
                              review_note, reg_dt, review_dt
                    """, requestMapper(), UUID.randomUUID(), accountId, requestType, name, tagGroup,
                    reason == null || reason.isBlank() ? null : reason.strip());
        } catch (DuplicateKeyException exception) {
            // 동시 제출도 DB의 대기 요청 유일 키로 막아 중복 접수를 방지합니다.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "같은 내용의 제안을 이미 보냈어요. 처리 내역을 확인해 주세요.");
        }
    }

    public List<RequestView> mine(UUID accountId) {
        return jdbc.query("""
                SELECT request_id, request_type, tag_name, tag_group, request_rsn, request_st, review_note, reg_dt, review_dt
                FROM taste_tag_requests WHERE account_id = ?
                ORDER BY reg_dt DESC LIMIT 20
                """, requestMapper(), accountId);
    }

    private RowMapper<RequestView> requestMapper() {
        return (rs, row) -> new RequestView(
                rs.getObject("request_id", UUID.class), rs.getString("request_type"), rs.getString("tag_name"),
                TasteTagGroups.categoryFor(rs.getString("tag_group")), rs.getString("tag_group"), rs.getString("request_rsn"), rs.getString("request_st"),
                rs.getString("review_note"), rs.getObject("reg_dt", OffsetDateTime.class),
                rs.getObject("review_dt", OffsetDateTime.class));
    }

    public record RequestView(
            UUID requestId, String requestType, String tagName, String tagCategory, String tagGroup, String reason, String status,
            String reviewNote, OffsetDateTime createdAt, OffsetDateTime reviewedAt) {}
}
