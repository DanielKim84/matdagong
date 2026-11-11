package kr.matdagong.community.report;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/** 맛객 신고 API의 요청·응답 자료형입니다. */
public final class ReportModels {
    private ReportModels() {}

    /** 신고 이유입니다. DB의 taster_reports.reason 값과 같습니다. */
    public enum ReportReason {
        /** 불법·음란 사진. 피해가 커서 1건만으로도 관리자 확인 목록에 올립니다. */
        ILLEGAL_PHOTO,
        ADVERTISING,
        ABUSIVE,
        DEFAMATION,
        IMPERSONATION,
        SPAM,
        OTHER
    }

    /**
     * @param placeId 맛집 기록에서 신고했을 때 그 장소 ID. 프로필에서 신고했으면 null입니다.
     */
    public record ReportRequest(
            @NotNull(message = "신고 이유를 골라 주세요.") ReportReason reason,
            @Size(max = 500, message = "설명은 500자 이하로 입력해 주세요.") String memo,
            UUID placeId) {
        public ReportRequest {
            memo = memo == null ? "" : memo.trim();
        }
    }

    public record ReportResponse(String reportId) {}
}
