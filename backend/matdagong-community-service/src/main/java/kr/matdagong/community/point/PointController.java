package kr.matdagong.community.point;

import static kr.matdagong.community.point.PointModels.*;

import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 포인트 잔액과 적립·사용 원장을 로그인 사용자에게 제공합니다. */
@RestController
@RequestMapping("/api/v1/points")
public class PointController {
    private final PointService points;

    public PointController(PointService points) {
        this.points = points;
    }

    @GetMapping
    public PointAccount points(@AuthenticationPrincipal Jwt jwt) {
        return points.points(AuthenticatedAccount.id(jwt));
    }
}
