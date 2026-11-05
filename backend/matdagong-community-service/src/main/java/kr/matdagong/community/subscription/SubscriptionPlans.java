package kr.matdagong.community.subscription;

import static kr.matdagong.community.subscription.SubscriptionModels.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 구독 요금표와 신청할 수 있는 이용 기간 규칙입니다. */
final class SubscriptionPlans {
    /** 오픈 전 무료 이용 기간에도 유료 플랜의 기간별 테스트 안내 금액은 화면에 표시합니다. */
    private static final Map<Integer, BigDecimal> TEST_PRICES = Map.of(
            1, new BigDecimal("1000"),
            3, new BigDecimal("2700"),
            6, new BigDecimal("5000"),
            12, new BigDecimal("9000"));

    private SubscriptionPlans() {}

    static PlanCatalog catalog() {
        List<PaidPlan> paidPlans = TEST_PRICES.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new PaidPlan(entry.getKey(), entry.getValue()))
                .toList();
        return new PlanCatalog("KRW", true, BigDecimal.ZERO, paidPlans);
    }

    /** 무료 구독은 기간을 고르지 않고(null), 유료 구독은 요금표에 있는 기간만 받습니다. */
    static Integer validatedTerm(SubscribeRequest request) {
        if (request.subscriptionType() == SubscriptionType.FREE) {
            if (request.termMonths() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "무료 구독에는 기간을 선택할 수 없습니다.");
            }
            return null;
        }
        if (request.termMonths() == null || !TEST_PRICES.containsKey(request.termMonths())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유료 구독 기간은 1, 3, 6, 12개월 중 선택해 주세요.");
        }
        return request.termMonths();
    }
}
