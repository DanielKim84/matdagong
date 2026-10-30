-- 결제 기능 도입 전에는 PAID 유형도 실제 청구 없이 0원으로 이용합니다.
ALTER TABLE user_subscription_history
    DROP CONSTRAINT ck_subscription_history_paid_price,
    ADD CONSTRAINT ck_subscription_history_paid_price
        CHECK (subscription_type <> 'PAID' OR price_amt >= 0);

COMMENT ON CONSTRAINT ck_subscription_history_paid_price ON user_subscription_history IS
    '유료 구독은 결제 도입 전 무료 제공 기간에 0원으로 기록할 수 있다.';
