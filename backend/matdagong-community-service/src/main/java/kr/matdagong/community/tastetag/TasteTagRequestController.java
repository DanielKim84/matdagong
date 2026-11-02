package kr.matdagong.community.tastetag;

import static kr.matdagong.community.tastetag.TasteTagModels.*;

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

/** 로그인한 사용자의 태그 추가 요청을 접수하고 본인의 최근 요청만 제공합니다. */
@RestController
@RequestMapping("/api/v1/taste-tags/requests")
public class TasteTagRequestController {
    private final TasteTagRequestService requests;

    public TasteTagRequestController(TasteTagRequestService requests) {
        this.requests = requests;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TagRequestView create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TagRequest request) {
        return requests.create(AuthenticatedAccount.id(jwt), request);
    }

    @GetMapping("/mine")
    public List<TagRequestView> mine(@AuthenticationPrincipal Jwt jwt) {
        return requests.mine(AuthenticatedAccount.id(jwt));
    }
}
