-- A free subscription has no fixed term. Paid subscriptions can be purchased
-- for 1, 3, 6, or 12 months; each renewal keeps its own period history.
ALTER TABLE user_subscriptions
    DROP CONSTRAINT ck_user_subscriptions_term,
    ALTER COLUMN term_months DROP NOT NULL,
    ALTER COLUMN term_months DROP DEFAULT;

ALTER TABLE user_subscription_periods
    DROP CONSTRAINT ck_subscription_periods_term,
    ALTER COLUMN term_months DROP NOT NULL;

-- Existing FREE rows came from the earlier prototype's 1- or 3-month model.
-- Convert them to the new no-fixed-expiry meaning before adding the new checks.
UPDATE user_subscriptions
SET term_months = NULL
WHERE subscription_type = 'FREE';

UPDATE user_subscription_periods
SET term_months = NULL,
    end_dt = NULL
WHERE subscription_type = 'FREE';

ALTER TABLE user_subscriptions
    ADD CONSTRAINT ck_user_subscriptions_term
        CHECK (
            (subscription_type = 'FREE' AND term_months IS NULL)
            OR (subscription_type = 'PAID' AND term_months IN (1, 3, 6, 12))
        );

ALTER TABLE user_subscription_periods
    ADD CONSTRAINT ck_subscription_periods_term
        CHECK (
            (subscription_type = 'FREE' AND term_months IS NULL)
            OR (subscription_type = 'PAID' AND term_months IN (1, 3, 6, 12))
        ),
    ADD CONSTRAINT ck_subscription_periods_free_no_expiry
        CHECK (subscription_type <> 'FREE' OR end_dt IS NULL);

COMMENT ON COLUMN user_subscriptions.subscription_type IS '현재 구독 유형: FREE(기간 제한 없는 무료 구독) 또는 PAID(기간제 유료 구독).';
COMMENT ON COLUMN user_subscriptions.term_months IS '유료 구독 기간(개월): 1, 3, 6 또는 12. 무료 구독은 기간 제한이 없어 NULL.';
COMMENT ON TABLE user_subscriptions IS '구독자와 맛객 간 현재 구독 관계. 무료 구독은 한 명만 활성화할 수 있으며 새 무료 구독을 선택하면 기존 무료 구독을 교체한다.';
COMMENT ON COLUMN user_subscription_periods.subscription_type IS '해당 회차 유형: 기간 제한 없는 무료 구독 FREE 또는 유료 구독 PAID.';
COMMENT ON COLUMN user_subscription_periods.term_months IS '유료 구독 회차의 기간(개월): 1, 3, 6 또는 12. 무료 구독은 NULL.';
COMMENT ON COLUMN user_subscription_periods.end_dt IS '이용 기간 종료 시각. 무료 구독은 기간 제한이 없어 NULL이며, 유료 구독은 결제된 기간 종료 시각을 기록한다.';
