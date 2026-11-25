package kr.matdagong.community.subscription;

import static kr.matdagong.community.subscription.SubscriptionModels.*;

import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 구독 신청에서 고를 수 있는 이용 기간 규칙입니다. */
final class SubscriptionPlans {
    /** 유료 구독 기간(개월)입니다. 요금은 결제 연동 때 정하고, 지금은 오픈 전 무료 이용이라 0원으로 기록합니다(SubscriptionService.PRELAUNCH_PRICE). */
    private static final Set<Integer> PAID_TERMS = Set.of(1, 3, 6, 12);

    private SubscriptionPlans() {}

    /** 무료 구독은 기간을 고르지 않고(null), 유료 구독은 PAID_TERMS에 있는 기간만 받습니다. */
    static Integer validatedTerm(SubscribeRequest request) {
        if (request.subscriptionType() == SubscriptionType.FREE) {
            if (request.termMonths() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "무료 구독에는 기간을 선택할 수 없습니다.");
            }
            return null;
        }
        if (request.termMonths() == null || !PAID_TERMS.contains(request.termMonths())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유료 구독 기간은 1, 3, 6, 12개월 중 선택해 주세요.");
        }
        return request.termMonths();
    }
}
