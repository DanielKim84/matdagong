-- SQL CHECK constraints accept NULL results, so explicitly reject a missing term for PAID rows.
ALTER TABLE user_subscriptions
    DROP CONSTRAINT ck_user_subscriptions_term,
    ADD CONSTRAINT ck_user_subscriptions_term CHECK (
        (subscription_type = 'FREE' AND term_months IS NULL)
        OR (subscription_type = 'PAID' AND term_months IS NOT NULL AND term_months IN (1, 3, 6, 12))
    );

ALTER TABLE user_subscription_periods
    DROP CONSTRAINT ck_subscription_periods_term,
    ADD CONSTRAINT ck_subscription_periods_term CHECK (
        (subscription_type = 'FREE' AND term_months IS NULL)
        OR (subscription_type = 'PAID' AND term_months IS NOT NULL AND term_months IN (1, 3, 6, 12))
    );
