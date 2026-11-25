-- 포인트 잔액을 거래 이력의 합으로 계산할 수 있도록 사용자별 원장을 만듭니다.
CREATE TABLE user_point_history (
    point_history_id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    event_type VARCHAR(10) NOT NULL,
    title VARCHAR(80) NOT NULL,
    memo VARCHAR(300),
    point_amt INTEGER NOT NULL,
    reference_key VARCHAR(100),
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_point_history_type CHECK (event_type IN ('EARN', 'SPEND', 'ADJUST')),
    CONSTRAINT ck_user_point_history_amount CHECK (point_amt <> 0)
);

CREATE INDEX ix_user_point_history_account_date
    ON user_point_history (account_id, reg_dt DESC);
CREATE UNIQUE INDEX ux_user_point_history_reference
    ON user_point_history (account_id, reference_key)
    WHERE reference_key IS NOT NULL;

COMMENT ON TABLE user_point_history IS '사용자 포인트 적립과 사용 내역.';
COMMENT ON COLUMN user_point_history.point_history_id IS '포인트 내역 UUID.';
COMMENT ON COLUMN user_point_history.account_id IS '포인트 소유 계정 UUID.';
COMMENT ON COLUMN user_point_history.event_type IS '내역 유형: 적립, 사용, 조정.';
COMMENT ON COLUMN user_point_history.title IS '내역 제목.';
COMMENT ON COLUMN user_point_history.memo IS '추가 설명.';
COMMENT ON COLUMN user_point_history.point_amt IS '변동 포인트. 적립은 양수, 사용은 음수.';
COMMENT ON COLUMN user_point_history.reference_key IS '중복 반영 방지용 업무 키.';
COMMENT ON COLUMN user_point_history.reg_dt IS '내역 생성 시각.';
