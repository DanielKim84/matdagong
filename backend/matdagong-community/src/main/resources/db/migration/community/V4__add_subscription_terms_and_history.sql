-- Keep the current subscriber-to-creator relationship, while storing each
-- manually renewed 1- or 3-month term as an immutable history record.
ALTER TABLE user_subscriptions
    ADD COLUMN subscription_type VARCHAR(4) NOT NULL DEFAULT 'FREE',
    ADD COLUMN term_months SMALLINT NOT NULL DEFAULT 1,
    ADD CONSTRAINT ck_user_subscriptions_type CHECK (subscription_type IN ('FREE', 'PAID')),
    ADD CONSTRAINT ck_user_subscriptions_term CHECK (term_months IN (1, 3));

-- A subscriber can have only one currently active free creator subscription.
-- Once it expires, the relation becomes inactive and the free slot can be reused.
CREATE UNIQUE INDEX uk_user_subscriptions_active_free
    ON user_subscriptions (subscriber_id)
    WHERE subscription_st = 'ACTIVE' AND subscription_type = 'FREE';

-- Each renewal creates a new row so term length, price, and reward references
-- remain auditable instead of overwriting the previous subscription period.
CREATE TABLE user_subscription_periods (
    subscription_period_id UUID PRIMARY KEY,
    subscription_id UUID NOT NULL,
    subscription_type VARCHAR(4) NOT NULL,
    term_months SMALLINT NOT NULL,
    period_st VARCHAR(8) NOT NULL DEFAULT 'PENDING',
    price_amt NUMERIC(12, 2) NOT NULL DEFAULT 0,
    start_dt TIMESTAMPTZ,
    end_dt TIMESTAMPTZ,
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_subscription_periods_subscription
        FOREIGN KEY (subscription_id) REFERENCES user_subscriptions (subscription_id),
    CONSTRAINT ck_subscription_periods_type CHECK (subscription_type IN ('FREE', 'PAID')),
    CONSTRAINT ck_subscription_periods_term CHECK (term_months IN (1, 3)),
    CONSTRAINT ck_subscription_periods_status
        CHECK (period_st IN ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELED', 'FAILED')),
    CONSTRAINT ck_subscription_periods_price CHECK (price_amt >= 0),
    CONSTRAINT ck_subscription_periods_free_price CHECK (subscription_type <> 'FREE' OR price_amt = 0),
    CONSTRAINT ck_subscription_periods_paid_price CHECK (subscription_type <> 'PAID' OR price_amt > 0),
    CONSTRAINT ck_subscription_periods_dates
        CHECK (start_dt IS NULL OR end_dt IS NULL OR start_dt < end_dt)
);

-- Keep one running period and one paid renewal awaiting confirmation per relationship.
CREATE UNIQUE INDEX uk_subscription_periods_active
    ON user_subscription_periods (subscription_id)
    WHERE period_st = 'ACTIVE';
CREATE UNIQUE INDEX uk_subscription_periods_pending
    ON user_subscription_periods (subscription_id)
    WHERE period_st = 'PENDING';
CREATE INDEX idx_subscription_periods_end_status
    ON user_subscription_periods (end_dt, period_st);

COMMENT ON COLUMN user_subscriptions.subscription_type IS '현재 구독의 유형: FREE 또는 PAID. 무료 구독은 사용자당 활성 1건만 허용한다.';
COMMENT ON COLUMN user_subscriptions.term_months IS '현재 구독 기간(개월): 1개월 또는 3개월.';
COMMENT ON TABLE user_subscription_periods IS '구독 시작·수동 갱신별 기간 이력. 포인트 리워드 지급은 이 이력의 UUID를 기준으로 중복을 방지한다.';
COMMENT ON COLUMN user_subscription_periods.subscription_period_id IS '구독 기간 이력 UUID. 결제·리워드 처리에서 해당 구독 회차를 식별한다.';
COMMENT ON COLUMN user_subscription_periods.subscription_id IS '구독자와 맛객 간 구독 관계 UUID.';
COMMENT ON COLUMN user_subscription_periods.subscription_type IS '해당 회차 유형: 첫 무료 구독 자리 사용 시 FREE, 그 외는 PAID.';
COMMENT ON COLUMN user_subscription_periods.term_months IS '해당 회차의 선택 기간(개월): 1 또는 3.';
COMMENT ON COLUMN user_subscription_periods.period_st IS '회차 상태: 결제 대기, 이용 중, 만료, 취소 또는 결제 실패.';
COMMENT ON COLUMN user_subscription_periods.price_amt IS '해당 회차의 확정 구독 금액. 무료 회차는 0원이며 유료 요금은 가입 시점 값으로 보존한다.';
COMMENT ON COLUMN user_subscription_periods.start_dt IS '서비스 이용 기간 시작 시각. 결제 완료 또는 무료 구독 시작 시 기록한다.';
COMMENT ON COLUMN user_subscription_periods.end_dt IS '서비스 이용 기간 종료 시각.';
COMMENT ON COLUMN user_subscription_periods.reg_dt IS '구독 기간 회차 생성 시각.';
