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

/** 사용자가 제안한 태그를 검토 대기열에 저장합니다. 검토 전에는 선택 목록에 추가하지 않습니다. */
@Service
public class TasteTagRequestService {
    private final JdbcTemplate jdbc;

    public TasteTagRequestService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public RequestView create(UUID accountId, String requestedName, String category, String reason) {
        String name = requestedName.strip().replaceAll("\\s+", " ");
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "추가할 태그명을 입력해 주세요.");
        }
        Integer profileCount = jdbc.queryForObject(
                "SELECT count(*) FROM user_profiles WHERE account_id = ?", Integer.class, accountId);
        if (profileCount == null || profileCount == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "프로필을 먼저 등록해 주세요.");
        }
        Integer existingCount = jdbc.queryForObject(
                "SELECT count(*) FROM taste_tags WHERE lower(tag_name) = lower(?)", Integer.class, name);
        if (existingCount != null && existingCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 선택 목록에 있는 태그예요.");
        }

        try {
            return jdbc.queryForObject("""
                    INSERT INTO taste_tag_requests (request_id, account_id, tag_name, tag_category, request_rsn)
                    VALUES (?, ?, ?, ?, ?)
                    RETURNING request_id, tag_name, tag_category, request_rsn, request_st,
                              review_note, reg_dt, review_dt
                    """, requestMapper(), UUID.randomUUID(), accountId, name, category,
                    reason == null || reason.isBlank() ? null : reason.strip());
        } catch (DuplicateKeyException exception) {
            // 동시 제출도 DB의 대기 요청 유일 키로 막아 중복 접수를 방지합니다.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "같은 태그를 이미 요청했어요. 검토를 기다려 주세요.");
        }
    }

    public List<RequestView> mine(UUID accountId) {
        return jdbc.query("""
                SELECT request_id, tag_name, tag_category, request_rsn, request_st, review_note, reg_dt, review_dt
                FROM taste_tag_requests WHERE account_id = ?
                ORDER BY reg_dt DESC LIMIT 20
                """, requestMapper(), accountId);
    }

    private RowMapper<RequestView> requestMapper() {
        return (rs, row) -> new RequestView(
                rs.getObject("request_id", UUID.class), rs.getString("tag_name"),
                rs.getString("tag_category"), rs.getString("request_rsn"), rs.getString("request_st"),
                rs.getString("review_note"), rs.getObject("reg_dt", OffsetDateTime.class),
                rs.getObject("review_dt", OffsetDateTime.class));
    }

    public record RequestView(
            UUID requestId, String tagName, String tagCategory, String reason, String status,
            String reviewNote, OffsetDateTime createdAt, OffsetDateTime reviewedAt) {}
}
