-- 공통 계정의 user_id는 dagong-auth가 소유하므로 이 DB에는 외래 키를 만들지 않습니다.
CREATE TABLE taster_profiles (
    account_id UUID PRIMARY KEY,
    nickname VARCHAR(30) NOT NULL,
    profile_img_url VARCHAR(500),
    intro VARCHAR(300),
    profile_visibility VARCHAR(8) NOT NULL DEFAULT 'PUBLIC',
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    upd_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_taster_profiles_nickname UNIQUE (nickname),
    CONSTRAINT ck_taster_profiles_visibility CHECK (profile_visibility IN ('PUBLIC', 'PRIVATE'))
);

-- 맛객 간 구독은 서비스 내부 관계이므로 계정 DB와 분리해 관리합니다.
CREATE TABLE user_subscriptions (
    subscription_id UUID PRIMARY KEY,
    subscriber_id UUID NOT NULL,
    target_account_id UUID NOT NULL,
    subscription_st VARCHAR(8) NOT NULL DEFAULT 'ACTIVE',
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    upd_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_user_subscriptions_pair UNIQUE (subscriber_id, target_account_id),
    CONSTRAINT ck_user_subscriptions_not_self CHECK (subscriber_id <> target_account_id),
    CONSTRAINT ck_user_subscriptions_status CHECK (subscription_st IN ('ACTIVE', 'INACTIVE'))
);

-- 팔로워·팔로잉 목록과 활성 구독 수를 빠르게 조회합니다.
CREATE INDEX idx_user_subscriptions_target_status
    ON user_subscriptions (target_account_id, subscription_st, reg_dt DESC);
CREATE INDEX idx_user_subscriptions_subscriber_status
    ON user_subscriptions (subscriber_id, subscription_st, reg_dt DESC);

COMMENT ON TABLE taster_profiles IS '맛다공에서 사용하는 공통 계정별 공개 프로필.';
COMMENT ON COLUMN taster_profiles.account_id IS 'dagong-auth accounts.user_id와 같은 공통 계정 UUID. 서비스 간 외래 키는 설정하지 않는다.';
COMMENT ON COLUMN taster_profiles.nickname IS '맛다공 프로필에 표시되는 고유 닉네임.';
COMMENT ON COLUMN taster_profiles.profile_img_url IS '프로필 이미지의 저장소 URL.';
COMMENT ON COLUMN taster_profiles.intro IS '사용자가 작성한 짧은 자기소개.';
COMMENT ON COLUMN taster_profiles.profile_visibility IS '프로필 공개 범위: PUBLIC 또는 PRIVATE.';
COMMENT ON COLUMN taster_profiles.reg_dt IS '맛다공 프로필 생성 시각.';
COMMENT ON COLUMN taster_profiles.upd_dt IS '맛다공 프로필의 마지막 수정 시각.';

COMMENT ON TABLE user_subscriptions IS '맛다공 사용자 간 구독(팔로우) 관계.';
COMMENT ON COLUMN user_subscriptions.subscription_id IS '구독 관계 레코드 UUID.';
COMMENT ON COLUMN user_subscriptions.subscriber_id IS '구독을 시작한 공통 계정 UUID.';
COMMENT ON COLUMN user_subscriptions.target_account_id IS '구독 대상 공통 계정 UUID.';
COMMENT ON COLUMN user_subscriptions.subscription_st IS '구독 상태: ACTIVE 또는 INACTIVE. 재구독 시 기존 관계를 다시 활성화한다.';
COMMENT ON COLUMN user_subscriptions.reg_dt IS '구독 관계 최초 생성 시각.';
COMMENT ON COLUMN user_subscriptions.upd_dt IS '구독 상태의 마지막 변경 시각.';
