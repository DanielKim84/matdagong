package kr.matdagong.community.subscription;

import static kr.matdagong.community.subscription.SubscriptionModels.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import kr.matdagong.community.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
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
        return service.tasters(AuthenticatedAccount.id(jwt));
    }

    @GetMapping("/subscriptions/plans")
    public PlanCatalog plans() {
        return service.plans();
    }

    @GetMapping("/subscriptions")
    public List<SubscriptionView> subscriptions(@AuthenticationPrincipal Jwt jwt) {
        return service.subscriptions(AuthenticatedAccount.id(jwt));
    }

    @GetMapping("/subscriptions/subscribers")
    public List<IncomingSubscriptionView> subscribers(@AuthenticationPrincipal Jwt jwt) {
        return service.subscribers(AuthenticatedAccount.id(jwt));
    }

    @PostMapping("/subscriptions")
    public SubscribeResult subscribe(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SubscribeRequest request) {
        return service.subscribe(AuthenticatedAccount.id(jwt), request);
    }

    @DeleteMapping("/subscriptions/{subscriptionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelSubscription(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID subscriptionId) {
        service.cancelSubscription(AuthenticatedAccount.id(jwt), subscriptionId);
    }
}
