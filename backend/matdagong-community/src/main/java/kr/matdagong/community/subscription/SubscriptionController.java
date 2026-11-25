package kr.matdagong.community.subscription;

import static kr.matdagong.community.subscription.SubscriptionModels.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 사용자에게 구독 상품, 현재 구독·구독자 목록과 구독 신청·취소 API를 제공합니다. */
@RestController
@RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {
    private final SubscriptionService subscriptions;

    public SubscriptionController(SubscriptionService subscriptions) {
        this.subscriptions = subscriptions;
    }

    @GetMapping("/plans")
    public PlanCatalog plans() {
        return subscriptions.plans();
    }

    @GetMapping
    public List<SubscriptionView> subscriptions(@AuthenticationPrincipal Jwt jwt) {
        return subscriptions.subscriptions(AuthenticatedAccount.id(jwt));
    }

    @GetMapping("/subscribers")
    public List<IncomingSubscriptionView> subscribers(@AuthenticationPrincipal Jwt jwt) {
        return subscriptions.subscribers(AuthenticatedAccount.id(jwt));
    }

    @PostMapping
    public SubscribeResult subscribe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SubscribeRequest request) {
        return subscriptions.subscribe(AuthenticatedAccount.id(jwt), request);
    }

    @DeleteMapping("/{subscriptionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelSubscription(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID subscriptionId) {
        subscriptions.cancelSubscription(AuthenticatedAccount.id(jwt), subscriptionId);
    }
}
