package kr.matdagong.community.tastetag;

import static kr.matdagong.community.tastetag.TasteTagModels.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.common.web.ApiErrors;
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
    private static final int RECENT_REQUEST_LIMIT = 20;
    private static final RowMapper<TagRequestView> REQUEST_MAPPER = (rs, row) -> {
        TasteTagGroup group = TasteTagGroup.valueOf(rs.getString("tag_group"));
        return new TagRequestView(
                rs.getObject("request_id", UUID.class),
                TagRequestType.valueOf(rs.getString("request_type")),
                rs.getString("tag_name"),
                group.category(),
                group,
                rs.getString("request_rsn"),
                TagRequestStatus.valueOf(rs.getString("request_st")),
                rs.getString("review_note"),
                rs.getObject("reg_dt", OffsetDateTime.class),
                rs.getObject("review_dt", OffsetDateTime.class));
    };

    private final JdbcTemplate jdbc;

    public TasteTagRequestService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public TagRequestView create(UUID accountId, TagRequest request) {
        TagRequestType requestType = request.requestType() == null ? TagRequestType.TAG : request.requestType();
        // 매장 이용 정보 제안은 화면이 보낸 그룹과 관계없이 방문 조건(VISIT) 검토 대상으로 분류합니다.
        TasteTagGroup tagGroup = requestType == TagRequestType.PLACE_INFO ? TasteTagGroup.VISIT : request.tagGroup();
        String name = request.name().strip().replaceAll("\\s+", " ");
        if (!hasProfile(accountId)) throw ApiErrors.profileRequired();
        if (requestType == TagRequestType.TAG && isExistingTag(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 선택 목록에 있는 태그예요.");
        }

        try {
            return jdbc.queryForObject(
                    """
                    INSERT INTO taste_tag_requests (request_id, account_id, request_type, tag_name, tag_group, request_rsn)
                    VALUES (?, ?, ?, ?, ?, ?)
                    RETURNING request_id, request_type, tag_name, tag_group, request_rsn, request_st,
                              review_note, reg_dt, review_dt
                    """,
                    REQUEST_MAPPER,
                    UUID.randomUUID(),
                    accountId,
                    requestType.name(),
                    name,
                    tagGroup.name(),
                    request.reason() == null || request.reason().isBlank()
                            ? null
                            : request.reason().strip());
        } catch (DuplicateKeyException exception) {
            // 동시 제출도 DB의 대기 요청 유일 키로 막아 중복 접수를 방지합니다.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "같은 내용의 제안을 이미 보냈어요. 처리 내역을 확인해 주세요.");
        }
    }

    @Transactional(readOnly = true)
    public List<TagRequestView> mine(UUID accountId) {
        return jdbc.query(
                """
                SELECT request_id, request_type, tag_name, tag_group, request_rsn, request_st, review_note, reg_dt, review_dt
                FROM taste_tag_requests WHERE account_id = ?
                ORDER BY reg_dt DESC LIMIT ?
                """,
                REQUEST_MAPPER,
                accountId,
                RECENT_REQUEST_LIMIT);
    }

    private boolean hasProfile(UUID accountId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE account_id = ?)", Boolean.class, accountId));
    }

    private boolean isExistingTag(String name) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM taste_tags WHERE lower(tag_name) = lower(?))", Boolean.class, name));
    }
}
