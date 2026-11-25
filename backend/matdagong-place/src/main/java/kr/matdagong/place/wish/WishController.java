package kr.matdagong.place.wish;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static kr.matdagong.place.wish.WishModels.*;

import jakarta.validation.Valid;
import kr.matdagong.common.security.AuthenticatedAccount;
import kr.matdagong.place.kakao.KakaoPlaceVerifier;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 내 지도의 카카오 검색에서 고른 가게를 가볼 곳으로 저장합니다. 카카오 확인은 외부 호출이라 트랜잭션 전에 끝냅니다. */
@RestController
@RequestMapping("/api/v1/places/wishes")
public class WishController {
    private final WishService wishes;
    private final KakaoPlaceVerifier kakaoPlaces;

    public WishController(WishService wishes, KakaoPlaceVerifier kakaoPlaces) {
        this.wishes = wishes;
        this.kakaoPlaces = kakaoPlaces;
    }

    @PostMapping
    public PlaceView save(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody WishPlaceRequest request) {
        return wishes.save(
                AuthenticatedAccount.id(jwt),
                kakaoPlaces.verify(request.providerCode(), request.providerPlaceId(), request.submittedPlace()),
                request);
    }
}
