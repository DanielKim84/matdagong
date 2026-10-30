package kr.matdagong.community.profile;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 가입과 프로필 설정 화면에서 선택할 수 있는 공통 취향 태그 목록을 제공합니다. */
@RestController
@RequestMapping("/api/v1/taste-tags")
public class TasteTagController {
    private final JdbcTemplate jdbc;

    public TasteTagController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<TasteTagView> list() {
        return jdbc.query("""
                SELECT tag_name, tag_group
                FROM taste_tags
                ORDER BY sort_order
                """, (rs, row) -> new TasteTagView(
                rs.getString("tag_name"), TasteTagGroups.categoryFor(rs.getString("tag_group")), rs.getString("tag_group")));
    }

    public record TasteTagView(String name, String category, String tagGroup) {}
}
