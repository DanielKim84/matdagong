package kr.matdagong.community.tastetag;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.UUID;
import kr.matdagong.common.tag.TasteTagCategory;
import kr.matdagong.common.tag.TasteTagGroup;

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

    public record TasteTagView(String name, TasteTagCategory category, TasteTagGroup tagGroup) {}

    /** requestType을 비우면 TAG로 접수합니다. */
    public record TagRequest(
            TagRequestType requestType,
            @NotBlank(message = "추가할 태그명을 입력해 주세요.") @Size(max = 30, message = "태그명은 30자 이하로 입력해 주세요.") String name,
            @NotNull(message = "태그 분류를 선택해 주세요.") TasteTagGroup tagGroup,
            @Size(max = 300, message = "제안 이유는 300자 이하로 입력해 주세요.") String reason) {}

    public record TagRequestView(
            UUID requestId,
            TagRequestType requestType,
            String tagName,
            TasteTagCategory tagCategory,
            TasteTagGroup tagGroup,
            String reason,
            TagRequestStatus status,
            String reviewNote,
            OffsetDateTime createdAt,
            OffsetDateTime reviewedAt) {}
}
