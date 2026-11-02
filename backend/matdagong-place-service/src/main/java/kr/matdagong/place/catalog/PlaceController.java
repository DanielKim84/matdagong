package kr.matdagong.place.catalog;

import static kr.matdagong.place.catalog.PlaceModels.*;

import java.util.List;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 장소 검색과 장소 상세 API를 제공합니다. */
@RestController
@RequestMapping("/api/v1/places")
public class PlaceController {
    private final PlaceQueryService places;

    public PlaceController(PlaceQueryService places) {
        this.places = places;
    }

    @GetMapping
    public List<PlaceView> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String q) {
        return places.findAll(q, AuthenticatedAccount.id(jwt));
    }

    @GetMapping("/{id}")
    public PlaceView get(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return places.findById(id, AuthenticatedAccount.id(jwt))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다."));
    }
}
