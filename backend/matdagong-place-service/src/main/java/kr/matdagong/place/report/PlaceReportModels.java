package kr.matdagong.place.report;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 맛집 정보 제보 API의 요청·응답 자료형입니다. */
public final class PlaceReportModels {
    private PlaceReportModels() {}

    /** 제보 이유. 화면의 고르기 항목과 같고, DB 검사 조건(ck_place_reports_reason)과도 맞춥니다. */
    public enum PlaceReportReason {
        CLOSED,
        WRONG_NAME,
        WRONG_ADDRESS,
        WRONG_PHONE,
        WRONG_LOCATION,
        OTHER
    }

    /** 설명 500자는 화면 PlaceReportSheet의 MEMO_MAX, DB place_reports.memo(VARCHAR(500))와 맞춥니다. */
    public record PlaceReportRequest(
            @NotNull(message = "제보 이유를 골라 주세요.") PlaceReportReason reason,
            @Size(max = 500, message = "설명은 500자까지 쓸 수 있어요.") String memo) {}

    /** duplicate는 확인 전인 같은 제보가 이미 있어 새로 만들지 않았다는 뜻입니다. 화면은 이 값으로 안내 문구만 바꿉니다. */
    public record PlaceReportResponse(boolean duplicate) {}
}
