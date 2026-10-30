-- 결제 연동 전 만들어진 테스트 유료 구독은 실제 청구가 없으므로 금액을 0원으로 정리합니다.
UPDATE user_subscription_history
SET price_amt = 0
WHERE subscription_type = 'PAID'
  AND price_amt <> 0;

COMMENT ON COLUMN user_subscription_history.price_amt IS
    '해당 구독 회차에 실제 청구한 금액. 결제 연동 전 유료 플랜 무료 제공 기간에는 0원.';
