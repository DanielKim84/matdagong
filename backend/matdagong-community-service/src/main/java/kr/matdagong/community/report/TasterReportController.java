package kr.matdagong.community.report;

import static kr.matdagong.community.report.ReportModels.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 맛객 프로필·맛집 기록에서 맛객을 신고하고, 내가 신고한(확인 전) 맛객 목록을 알려 줍니다. */
@RestController
public class TasterReportController {
    private final TasterReportService reports;

    public TasterReportController(TasterReportService reports) {
        this.reports = reports;
    }

    /** 이미 확인 전인 신고가 있으면 409로 답합니다. */
    @PostMapping("/api/v1/tasters/{tasterId}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResponse report(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID tasterId, @Valid @RequestBody ReportRequest request) {
        return reports.report(AuthenticatedAccount.id(jwt), tasterId, request);
    }

    @GetMapping("/api/v1/users/me/taster-reports")
    public List<String> myReportedTasters(@AuthenticationPrincipal Jwt jwt) {
        return reports.myPendingTargets(AuthenticatedAccount.id(jwt));
    }
}
