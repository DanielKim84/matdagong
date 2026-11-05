package kr.matdagong.place.trust;

import static kr.matdagong.place.trust.TasteTrustModels.*;

import java.util.List;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 커뮤니티 서비스가 맛객 신뢰 %를 계산할 때 쓰는 경험 재료를 제공합니다. */
@RestController
@RequestMapping("/api/v1/places")
public class TasteTrustController {
    private final TasteTrustService trust;

    public TasteTrustController(TasteTrustService trust) {
        this.trust = trust;
    }

    @GetMapping("/trust-stats")
    public List<TasteTrustStats> trustStats(@AuthenticationPrincipal Jwt jwt) {
        return trust.statsFor(AuthenticatedAccount.id(jwt));
    }
}
