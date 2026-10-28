package kr.matdagong.community.subscription;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** 화면에 필요한 구독 상품, 맛객 프로필, 현재 구독 정보를 표현합니다. */
public final class SubscriptionModels {
    private SubscriptionModels() {}

    public enum SubscriptionType {
        FREE,
        PAID
    }

    public record TasterView(
            String tasterId,
            String tasterName,
            String tag,
            String avatar,
            int avatarVariant,
            String profileCoverUrl,
            String tasterFocus,
            String activityScope,
            String activityRegion,
            String note,
            String intro,
            int subscriberCount,
            List<String> profileTags,
            List<String> matchedTags,
            int matchScore) {}

    public record PaidPlan(int termMonths, BigDecimal priceAmount) {}

    public record PlanCatalog(String currency, boolean testMode, BigDecimal freePrice, List<PaidPlan> paidPlans) {}

    public record SubscribeRequest(
            @NotNull UUID targetAccountId,
            @NotNull SubscriptionType subscriptionType,
            Integer termMonths) {}

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

    public record SubscribeResult(SubscriptionView subscription, String replacedFreeNickname) {}
}
