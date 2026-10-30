package kr.matdagong.place.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import kr.matdagong.place.application.CommunityProfileClient;
import kr.matdagong.place.application.KakaoPlaceVerifier;
import kr.matdagong.place.application.PlaceRecordService;
import kr.matdagong.place.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 장소 검색·상세와 로그인 사용자별 맛집 기록 API를 제공합니다. */
@RestController
@RequestMapping("/api/v1/places")
public class PlaceController {
    private final PlaceRecordService places;
    private final CommunityProfileClient profiles;
    private final KakaoPlaceVerifier kakaoPlaces;

    public PlaceController(PlaceRecordService places, CommunityProfileClient profiles, KakaoPlaceVerifier kakaoPlaces) {
        this.places = places;
        this.profiles = profiles;
        this.kakaoPlaces = kakaoPlaces;
    }

    @GetMapping
    public List<PlaceView> list(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String q) {
        return places.findAll(q, AuthenticatedAccount.id(jwt));
    }

    @GetMapping("/records/mine")
    public List<PlaceView> mine(@AuthenticationPrincipal Jwt jwt) {
        return places.findMine(AuthenticatedAccount.id(jwt));
    }

    @GetMapping("/recent")
    public List<PlaceView> recent(@AuthenticationPrincipal Jwt jwt) {
        return places.findRecent(AuthenticatedAccount.id(jwt));
    }

    @PostMapping("/recent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rememberRecent(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RecentPlaceRequest request) {
        places.rememberRecent(AuthenticatedAccount.id(jwt), request.placeId());
    }

    /** 같은 장소에 내 기록이 이미 있으면 새로 만들지 않고 그 기록을 요청 내용으로 수정합니다. */
    @PostMapping("/records")
    public PlaceView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreatePlaceRecordRequest request) {
        // 프로필 조회와 카카오 장소 확인은 외부 호출이므로 DB 트랜잭션 밖에서 먼저 끝냅니다.
        UUID accountId = AuthenticatedAccount.id(jwt);
        return places.createRecord(accountId, profiles.findMyProfile(jwt.getTokenValue()),
                kakaoPlaces.verify(request), request);
    }

    @PostMapping("/records/from-like")
    public PlaceView convertLikeToRecord(@AuthenticationPrincipal Jwt jwt,
                                         @Valid @RequestBody LikeToRecordRequest request) {
        UUID accountId = AuthenticatedAccount.id(jwt);
        return places.convertLikeToRecord(accountId, profiles.findMyProfile(jwt.getTokenValue()),
                kakaoPlaces.verify(request.record()), request.sourcePlaceId(), request.record(), request.visitedConfirmed());
    }

    @PostMapping("/records/{placeId}/to-like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void convertRecordToLike(@AuthenticationPrincipal Jwt jwt, @PathVariable String placeId) {
        places.convertRecordToLike(AuthenticatedAccount.id(jwt), placeId);
    }

    @GetMapping("/drafts")
    public List<QuickPlaceDraftView> drafts(@AuthenticationPrincipal Jwt jwt) {
        return places.findDrafts(AuthenticatedAccount.id(jwt));
    }

    @GetMapping("/drafts/check")
    public QuickPlaceDuplicateView checkDraftDuplicate(@AuthenticationPrincipal Jwt jwt,
                                                       @RequestParam String providerCode,
                                                       @RequestParam String providerPlaceId) {
        return places.checkDraftDuplicate(AuthenticatedAccount.id(jwt), providerCode, providerPlaceId);
    }

    @PostMapping("/drafts")
    public QuickPlaceDraftView saveDraft(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody QuickPlaceDraftRequest request) {
        return places.saveDraft(AuthenticatedAccount.id(jwt), request);
    }

    @DeleteMapping("/drafts/{providerPlaceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDraft(@AuthenticationPrincipal Jwt jwt, @PathVariable String providerPlaceId,
                            @RequestParam(defaultValue = "KAKAO") String providerCode) {
        places.deleteDraft(AuthenticatedAccount.id(jwt), providerPlaceId, providerCode);
    }

    @GetMapping("/likes")
    public List<String> likes(@AuthenticationPrincipal Jwt jwt) {
        return places.likedPlaceIds(AuthenticatedAccount.id(jwt));
    }

    @GetMapping("/likes/visited")
    public List<String> visitedLikes(@AuthenticationPrincipal Jwt jwt) {
        return places.visitedLikedPlaceIds(AuthenticatedAccount.id(jwt));
    }

    @PutMapping("/{placeId}/like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setLike(@AuthenticationPrincipal Jwt jwt, @PathVariable String placeId, @RequestBody LikeRequest request) {
        places.setLiked(AuthenticatedAccount.id(jwt), placeId, request.liked());
    }

    @GetMapping("/{id}")
    public PlaceView get(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        PlaceView place = places.findById(id, AuthenticatedAccount.id(jwt));
        if (place == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다.");
        return place;
    }

    public record LikeRequest(boolean liked) {}

    public record RecentPlaceRequest(@NotBlank String placeId) {}

    public record LikeToRecordRequest(@NotBlank String sourcePlaceId, @NotNull @Valid CreatePlaceRecordRequest record,
                                      boolean visitedConfirmed) {}
}
