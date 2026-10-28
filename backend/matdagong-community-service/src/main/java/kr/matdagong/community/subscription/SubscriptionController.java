package kr.matdagong.community.subscription;

import static kr.matdagong.community.subscription.SubscriptionModels.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 사용자에게 맛객 목록과 구독 상품, 구독 신청 API를 제공합니다. */
@RestController
@RequestMapping("/api/v1")
public class SubscriptionController {
    private final SubscriptionService service;

    public SubscriptionController(SubscriptionService service) {
        this.service = service;
    }

    @GetMapping("/tasters")
    public List<TasterView> tasters(@AuthenticationPrincipal Jwt jwt) {
        return service.tasters(accountId(jwt));
    }

    @GetMapping("/subscriptions/plans")
    public PlanCatalog plans() {
        return service.plans();
    }

    @GetMapping("/subscriptions")
    public List<SubscriptionView> subscriptions(@AuthenticationPrincipal Jwt jwt) {
        return service.subscriptions(accountId(jwt));
    }

    @GetMapping("/subscriptions/subscribers")
    public List<IncomingSubscriptionView> subscribers(@AuthenticationPrincipal Jwt jwt) {
        return service.subscribers(accountId(jwt));
    }

    @PostMapping("/subscriptions")
    public SubscribeResult subscribe(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SubscribeRequest request) {
        return service.subscribe(accountId(jwt), request);
    }

    private UUID accountId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "인증 계정 ID가 올바르지 않습니다.");
        }
    }
}
