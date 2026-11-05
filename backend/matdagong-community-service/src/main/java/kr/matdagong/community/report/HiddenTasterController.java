package kr.matdagong.community.report;

import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 장소 서비스가 가려진 맛객의 기록·사진을 빼려고 주기적으로 읽는 서비스 간 주소입니다.
 * 게이트웨이 경로(/api/v1/**)에 없어 화면에서는 닿지 않고, 토큰 없이 같은 내부망의 서비스만 부릅니다.
 * 가려진 계정 ID 말고는 아무 정보도 담지 않습니다.
 */
@RestController
public class HiddenTasterController {
    private final TasterReportService reports;

    public HiddenTasterController(TasterReportService reports) {
        this.reports = reports;
    }

    @GetMapping("/internal/v1/hidden-tasters")
    public List<UUID> hiddenTasters() {
        return reports.hiddenTasters();
    }
}
