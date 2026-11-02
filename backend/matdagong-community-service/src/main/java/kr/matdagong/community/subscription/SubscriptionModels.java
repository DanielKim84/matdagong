package kr.matdagong.community.subscription;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** 구독 상품, 구독 신청, 현재 구독·구독자 API의 요청·응답 자료형입니다. */
public final class SubscriptionModels {
    private SubscriptionModels() {}

    public enum SubscriptionType {
        FREE,
        PAID
    }

    public record PaidPlan(int termMonths, BigDecimal priceAmount) {}

    public record PlanCatalog(String currency, boolean testMode, BigDecimal freePrice, List<PaidPlan> paidPlans) {}

    /**
     * 구독 신청입니다.
     *
     * @param termMonths 유료 구독 기간(개월)입니다. 무료 구독은 비워 둡니다.
     * @param confirmFreeReplacement 이미 다른 맛객을 무료 구독 중일 때, 그 구독을 끝내고 바꾸는 데 동의했는지입니다.
     */
    public record SubscribeRequest(
            @NotNull(message = "구독할 맛객을 선택해 주세요.") UUID targetAccountId,
            @NotNull(message = "구독 종류를 선택해 주세요.") SubscriptionType subscriptionType,
            Integer termMonths,
            boolean confirmFreeReplacement) {}

    public record SubscriptionView(
            UUID subscriptionId,
            UUID targetAccountId,
            String targetNickname,
            SubscriptionType subscriptionType,
            Integer termMonths,
            Instant startAt,
            Instant endAt) {}

    public record IncomingSubscriptionView(
            UUID subscriptionId,
            UUID subscriberAccountId,
            String subscriberNickname,
            String avatar,
            int avatarVariant,
            SubscriptionType subscriptionType,
            Integer termMonths,
            Instant startAt,
            Instant endAt) {}

    /** replacedFreeNickname은 이번 신청으로 무료 구독이 끝난 이전 맛객의 닉네임입니다. 없으면 null입니다. */
    public record SubscribeResult(SubscriptionView subscription, String replacedFreeNickname) {}
}
