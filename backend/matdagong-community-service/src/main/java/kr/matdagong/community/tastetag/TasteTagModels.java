package kr.matdagong.community.tastetag;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.common.text.Texts;

/** 취향 태그 목록과 태그 추가 제안 API의 요청·응답 자료형입니다. */
public final class TasteTagModels {
    private TasteTagModels() {}

    /** 제안 종류입니다. TAG는 새 취향 태그, PLACE_INFO는 매장 이용 정보(방문 조건) 제안입니다. */
    public enum TagRequestType {
        TAG,
        PLACE_INFO
    }

    /** 제안 처리 상태입니다. DB의 request_st 값과 같습니다. */
    public enum TagRequestStatus {
        PENDING,
        APPROVED,
        REJECTED
    }

    /** 태그 사전 한 줄입니다. 매장 이용 태그인지는 tagGroup == VISIT으로 구분합니다. */
    public record TasteTagView(String name, TasteTagGroup tagGroup) {}

    /**
     * 태그·매장 이용 정보 제안입니다. 이름의 앞뒤·연속 공백과 공백뿐인 이유는 검증 전에 정리합니다. 이름 30자·이유 300자는
     * 화면 TasteTagRequestSheet의 한도와 맞춥니다.
     */
    public record TagRequest(
            @NotNull(message = "제안 종류를 선택해 주세요.") TagRequestType requestType,
            @NotBlank(message = "추가할 태그명을 입력해 주세요.") @Size(max = 30, message = "태그명은 30자 이하로 입력해 주세요.") String name,
            @NotNull(message = "태그 분류를 선택해 주세요.") TasteTagGroup tagGroup,
            @Size(max = 300, message = "제안 이유는 300자 이하로 입력해 주세요.") String reason) {
        public TagRequest {

            name = name == null ? null : name.strip().replaceAll("\\s+", " ");
            reason = Texts.blankToNull(reason);
        }
    }

    /** 내 제안 한 줄입니다. 화면은 이름·분류·상태·검토 메모만 보여 주므로 제안 이유와 검토 시각은 보내지 않습니다. */
    public record TagRequestView(
            UUID requestId,
            TagRequestType requestType,
            String tagName,
            TasteTagGroup tagGroup,
            TagRequestStatus status,
            String reviewNote,
            Instant createdAt) {}
}
