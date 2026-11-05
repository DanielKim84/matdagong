package kr.matdagong.place.report;

import static kr.matdagong.place.report.PlaceReportModels.*;

import jakarta.validation.Valid;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 맛집 상세의 "잘못된 정보 알려주기" 제보를 받습니다. 확인·반영은 관리자 화면에서 합니다. */
@RestController
@RequestMapping("/api/v1/places/{placeId}/reports")
public class PlaceReportController {
    private final PlaceReportService reports;

    public PlaceReportController(PlaceReportService reports) {
        this.reports = reports;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PlaceReportResponse report(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String placeId,
            @Valid @RequestBody PlaceReportRequest request) {
        return reports.report(AuthenticatedAccount.id(jwt), placeId, request);
    }
}
