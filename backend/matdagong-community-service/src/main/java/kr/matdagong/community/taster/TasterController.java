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

    public TasterController(TasterService tasters) {
        this.tasters = tasters;
    }

    @GetMapping
    public List<TasterView> tasters(@AuthenticationPrincipal Jwt jwt) {
        return tasters.tasters(AuthenticatedAccount.id(jwt));
    }
}
