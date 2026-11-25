package kr.matdagong.community.tastetag;

import static kr.matdagong.community.tastetag.TasteTagModels.*;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 가입과 프로필 설정 화면에서 선택할 수 있는 공통 취향 태그 목록을 제공합니다. */
@RestController
@RequestMapping("/api/v1/taste-tags")
public class TasteTagController {
    private final TasteTagService tags;

    public TasteTagController(TasteTagService tags) {
        this.tags = tags;
    }

    @GetMapping
    public List<TasteTagView> list() {
        return tags.list();
    }
}
