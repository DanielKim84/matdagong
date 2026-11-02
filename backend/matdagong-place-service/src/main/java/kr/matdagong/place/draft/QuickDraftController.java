package kr.matdagong.place.draft;

import static kr.matdagong.place.draft.QuickDraftModels.*;

import jakarta.validation.Valid;
import java.util.List;
import kr.matdagong.common.security.AuthenticatedAccount;
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

    public QuickDraftController(QuickDraftService drafts) {
        this.drafts = drafts;
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

    @PostMapping
    public QuickPlaceDraftView saveDraft(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody QuickPlaceDraftRequest request) {
        return drafts.saveDraft(AuthenticatedAccount.id(jwt), request);
    }

    @DeleteMapping("/{providerPlaceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDraft(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String providerPlaceId,
            @RequestParam(defaultValue = "KAKAO") String providerCode) {
        drafts.deleteDraft(AuthenticatedAccount.id(jwt), providerPlaceId, providerCode);
    }
}
