package kr.matdagong.place.visit;

import java.util.List;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 내 다녀온 곳(빠른 저장·기록한 적 있는 곳) 목록 API입니다. */
@RestController
@RequestMapping("/api/v1/places")
public class PlaceVisitController {
    private final PlaceVisitService visits;

    public PlaceVisitController(PlaceVisitService visits) {
        this.visits = visits;
    }

    @GetMapping("/visits")
    public List<String> visits(@AuthenticationPrincipal Jwt jwt) {
        return visits.visitedPlaceIds(AuthenticatedAccount.id(jwt));
    }
}
