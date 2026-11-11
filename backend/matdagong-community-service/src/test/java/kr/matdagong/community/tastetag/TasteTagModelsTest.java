package kr.matdagong.community.tastetag;

import static kr.matdagong.community.tastetag.TasteTagModels.*;
import static org.assertj.core.api.Assertions.assertThat;

import kr.matdagong.common.tag.TasteTagGroup;
import org.junit.jupiter.api.Test;

/** 태그 제안 요청이 검증 전에 값을 정리하는지 확인합니다. */
class TasteTagModelsTest {
    @Test
    void 종류를_비우면_태그_제안이고_이름의_공백과_빈_이유를_정리한다() {
        TagRequest request = new TagRequest(null, "  평양   냉면 ", TasteTagGroup.CUISINE, "   ");

        assertThat(request.requestType()).isEqualTo(TagRequestType.TAG);
        assertThat(request.name()).isEqualTo("평양 냉면");
        assertThat(request.reason()).isNull();
        assertThat(new TagRequest(TagRequestType.PLACE_INFO, "콜키지", TasteTagGroup.VISIT, " 와인 ").reason())
                .isEqualTo("와인");
    }
}
