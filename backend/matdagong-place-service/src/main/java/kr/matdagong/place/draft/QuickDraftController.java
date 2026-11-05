package kr.matdagong.place.draft;

import static kr.matdagong.place.draft.QuickDraftModels.*;

import jakarta.validation.Valid;
import java.util.List;
import kr.matdagong.common.security.AuthenticatedAccount;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.kakao.KakaoPlaceVerifier;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 빠른 기록에 담은 장소의 조회·중복 확인·저장·삭제 API를 제공합니다. */
@RestController
@RequestMapping("/api/v1/places/drafts")
public class QuickDraftController {
    private final QuickDraftService drafts;
    private final KakaoPlaceVerifier kakaoPlaces;

    public QuickDraftController(QuickDraftService drafts, KakaoPlaceVerifier kakaoPlaces) {
        this.drafts = drafts;
        this.kakaoPlaces = kakaoPlaces;
    }

    @GetMapping
    public List<QuickPlaceDraftView> drafts(@AuthenticationPrincipal Jwt jwt) {
        return drafts.findDrafts(AuthenticatedAccount.id(jwt));
    }

    @GetMapping("/check")
    public QuickPlaceDuplicateView checkDraftDuplicate(
            @AuthenticationPrincipal Jwt jwt, @RequestParam String providerCode, @RequestParam String providerPlaceId) {
        return drafts.checkDuplicate(AuthenticatedAccount.id(jwt), providerCode, providerPlaceId);
    }

    /** 카카오 장소 확인은 외부 호출이라 DB 트랜잭션(Service)에 들어가기 전에 여기서 먼저 끝냅니다. */
    @PostMapping
    public QuickPlaceDraftView saveDraft(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody QuickPlaceDraftRequest request) {
        PlaceInfo place =
                kakaoPlaces.verify(request.providerCode(), request.providerPlaceId(), request.submittedPlace());
        return drafts.saveDraft(AuthenticatedAccount.id(jwt), place, request);
    }

    @DeleteMapping("/{providerPlaceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDraft(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String providerPlaceId,
            @RequestParam(defaultValue = PlaceIdentifiers.DEFAULT_PROVIDER) String providerCode) {
        drafts.deleteDraft(AuthenticatedAccount.id(jwt), providerPlaceId, providerCode);
    }
}
