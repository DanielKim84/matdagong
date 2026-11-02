package kr.matdagong.community.tastetag;

import static kr.matdagong.community.tastetag.TasteTagModels.*;

import java.util.List;
import kr.matdagong.common.tag.TasteTagGroup;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 가입과 프로필 설정 화면에서 고를 수 있는 공통 취향 태그 사전을 조회합니다. */
@Service
public class TasteTagService {
    private final JdbcTemplate jdbc;

    public TasteTagService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<TasteTagView> list() {
        return jdbc.query(
                """
                SELECT tag_name, tag_group
                FROM taste_tags
                ORDER BY sort_order
                """,
                (rs, row) -> {
                    TasteTagGroup group = TasteTagGroup.valueOf(rs.getString("tag_group"));
                    return new TasteTagView(rs.getString("tag_name"), group.category(), group);
                });
    }
}
