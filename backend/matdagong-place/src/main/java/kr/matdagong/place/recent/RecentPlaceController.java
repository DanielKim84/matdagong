package kr.matdagong.place.recent;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static kr.matdagong.place.recent.RecentPlaceModels.*;

import jakarta.validation.Valid;
import java.util.List;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 최근 본 장소의 조회·기록 API를 제공합니다. */
@RestController
@RequestMapping("/api/v1/places/recent")
public class RecentPlaceController {
    private final RecentPlaceService recentPlaces;

    public RecentPlaceController(RecentPlaceService recentPlaces) {
        this.recentPlaces = recentPlaces;
    }

    @GetMapping
    public List<PlaceView> recent(@AuthenticationPrincipal Jwt jwt) {
        return recentPlaces.findRecent(AuthenticatedAccount.id(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rememberRecent(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RecentPlaceRequest request) {
        recentPlaces.remember(AuthenticatedAccount.id(jwt), request.placeId());
    }
}
