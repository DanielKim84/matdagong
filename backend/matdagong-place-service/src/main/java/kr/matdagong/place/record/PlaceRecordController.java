package kr.matdagong.place.record;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static kr.matdagong.place.record.PlaceRecordModels.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.security.AuthenticatedAccount;
import kr.matdagong.place.kakao.KakaoPlaceVerifier;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import kr.matdagong.place.profile.CommunityProfileClient;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 로그인 사용자의 맛집 기록 저장·조회와 하트↔기록 전환 API를 제공합니다.
 * 작성자 프로필 조회와 카카오 장소 확인은 외부 호출이므로 DB 트랜잭션(Service)에 들어가기 전에 여기서 먼저 끝냅니다.
 */
@RestController
@RequestMapping("/api/v1/places/records")
public class PlaceRecordController {
    private final PlaceRecordService records;
    private final CommunityProfileClient profiles;
    private final KakaoPlaceVerifier kakaoPlaces;

    public PlaceRecordController(
            PlaceRecordService records, CommunityProfileClient profiles, KakaoPlaceVerifier kakaoPlaces) {
        this.records = records;
        this.profiles = profiles;
        this.kakaoPlaces = kakaoPlaces;
    }

    @GetMapping("/mine")
    public List<PlaceView> mine(@AuthenticationPrincipal Jwt jwt) {
        return records.findMine(AuthenticatedAccount.id(jwt));
    }

    /** 같은 장소에 내 기록이 이미 있으면 새로 만들지 않고 그 기록을 요청 내용으로 수정합니다. */
    @PostMapping
    public PlaceView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreatePlaceRecordRequest request) {
        UUID accountId = AuthenticatedAccount.id(jwt);
        return records.createRecord(
                accountId, profiles.findMyProfile(jwt.getTokenValue()), verifiedPlace(request), request);
    }

    @PostMapping("/from-like")
    public PlaceView convertLikeToRecord(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody LikeToRecordRequest request) {
        UUID accountId = AuthenticatedAccount.id(jwt);
        return records.convertLikeToRecord(
                accountId,
                profiles.findMyProfile(jwt.getTokenValue()),
                verifiedPlace(request.record()),
                request.sourcePlaceId(),
                request.record(),
                request.visitedConfirmed());
    }

    /** 내 기록 여러 곳을 한 번에 공개하거나 나만 보기로 바꿉니다. */
    @PutMapping("/visibility")
    public ChangeVisibilityResponse changeVisibility(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChangeVisibilityRequest request) {
        return new ChangeVisibilityResponse(
                records.changeVisibility(AuthenticatedAccount.id(jwt), request.placeIds(), request.visibility()));
    }

    @PostMapping("/{placeId}/to-like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void convertRecordToLike(@AuthenticationPrincipal Jwt jwt, @PathVariable String placeId) {
        records.convertRecordToLike(AuthenticatedAccount.id(jwt), placeId);
    }

    private PlaceInfo verifiedPlace(CreatePlaceRecordRequest request) {
        return kakaoPlaces.verify(request.providerCode(), request.providerPlaceId(), request.submittedPlace());
    }
}
