package kr.matdagong.community.taster;

import static kr.matdagong.community.taster.TasterModels.*;

import java.util.List;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 사용자에게 구독할 수 있는 다른 맛객 목록을 제공합니다. */
@RestController
@RequestMapping("/api/v1/tasters")
public class TasterController {
    private final TasterService tasters;
    private final PlaceTrustClient trust;

    public TasterController(TasterService tasters, PlaceTrustClient trust) {
        this.tasters = tasters;
        this.trust = trust;
    }

    /** 장소 서비스 호출이 DB 트랜잭션을 붙잡지 않도록 경험 재료를 먼저 받은 뒤 목록을 만듭니다. */
    @GetMapping
    public List<TasterView> tasters(@AuthenticationPrincipal Jwt jwt) {
        return tasters.tasters(AuthenticatedAccount.id(jwt), trust.statsFor(jwt.getTokenValue()));
    }
}
