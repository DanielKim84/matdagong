-- 구독 회차 데이터와 제약 조건을 보존한 채 이력 중심 이름으로 정리합니다.
ALTER TABLE user_subscription_periods RENAME TO user_subscription_history;
ALTER TABLE user_subscription_history
    RENAME COLUMN subscription_period_id TO subscription_history_id;

ALTER TABLE user_subscription_history
    RENAME CONSTRAINT fk_subscription_periods_subscription TO fk_subscription_history_subscription;
ALTER TABLE user_subscription_history
    RENAME CONSTRAINT ck_subscription_periods_type TO ck_subscription_history_type;
ALTER TABLE user_subscription_history
    RENAME CONSTRAINT ck_subscription_periods_term TO ck_subscription_history_term;
ALTER TABLE user_subscription_history
    RENAME CONSTRAINT ck_subscription_periods_status TO ck_subscription_history_status;
ALTER TABLE user_subscription_history
    RENAME CONSTRAINT ck_subscription_periods_price TO ck_subscription_history_price;
ALTER TABLE user_subscription_history
    RENAME CONSTRAINT ck_subscription_periods_free_price TO ck_subscription_history_free_price;
ALTER TABLE user_subscription_history
    RENAME CONSTRAINT ck_subscription_periods_paid_price TO ck_subscription_history_paid_price;
ALTER TABLE user_subscription_history
    RENAME CONSTRAINT ck_subscription_periods_dates TO ck_subscription_history_dates;
ALTER TABLE user_subscription_history
    RENAME CONSTRAINT ck_subscription_periods_free_no_expiry TO ck_subscription_history_free_no_expiry;

ALTER INDEX uk_subscription_periods_active RENAME TO uk_subscription_history_active;
ALTER INDEX uk_subscription_periods_pending RENAME TO uk_subscription_history_pending;
ALTER INDEX idx_subscription_periods_end_status RENAME TO idx_subscription_history_end_status;

COMMENT ON TABLE user_subscription_history IS '구독 회차별 이용 기간과 금액 이력.';
COMMENT ON COLUMN user_subscription_history.subscription_history_id IS '구독 이력 번호.';
