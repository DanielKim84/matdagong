-- 로컬/공유 개발 DB에서 마이 화면의 구독자 유형을 확인하기 위한 샘플 데이터입니다.
-- 실제 사용자 프로필 중 첫 계정을 대상으로 무료 1명, 유료 2명을 연결합니다.
BEGIN;

WITH demo_users(account_id, nickname, avatar_variant) AS (
    VALUES
        ('30000000-0000-4000-8000-000000000001'::UUID, '따뜻한식탁 구독자', 2),
        ('30000000-0000-4000-8000-000000000002'::UUID, '주말미식 구독자', 5),
        ('30000000-0000-4000-8000-000000000003'::UUID, '동네한바퀴 구독자', 8)
)
INSERT INTO user_profiles (account_id, nickname, avatar_variant, taster_focus, intro)
SELECT account_id, nickname, avatar_variant, 'RESTAURANT', '맛다공 구독 화면 확인용 테스트 계정입니다.'
FROM demo_users
ON CONFLICT (account_id) DO UPDATE
SET nickname = EXCLUDED.nickname,
    avatar_variant = EXCLUDED.avatar_variant,
    intro = EXCLUDED.intro,
    upd_dt = now();

-- 테스트 계정의 이전 샘플 회차를 종료한 뒤 현재 유형을 다시 설정합니다.
UPDATE user_subscription_history h
SET period_st = 'CANCELED'
FROM user_subscriptions s
WHERE h.subscription_id = s.subscription_id
  AND s.subscriber_id IN (
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000003'
  )
  AND h.period_st = 'ACTIVE';

WITH target AS (
    SELECT account_id
    FROM user_profiles
    WHERE account_id NOT IN (
        '20000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000003',
        '20000000-0000-4000-8000-000000000004',
        '20000000-0000-4000-8000-000000000005',
        '30000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000002',
        '30000000-0000-4000-8000-000000000003'
    )
    ORDER BY reg_dt
    LIMIT 1
), demo_subscribers(subscriber_id, subscription_type, term_months, end_dt) AS (
    VALUES
        ('30000000-0000-4000-8000-000000000001'::UUID, 'FREE', NULL::SMALLINT, NULL::TIMESTAMPTZ),
        ('30000000-0000-4000-8000-000000000002'::UUID, 'PAID', 1::SMALLINT, now() + interval '1 month'),
        ('30000000-0000-4000-8000-000000000003'::UUID, 'PAID', 3::SMALLINT, now() + interval '3 months')
)
INSERT INTO user_subscriptions (
    subscription_id, subscriber_id, target_account_id,
    subscription_st, subscription_type
)
SELECT
    gen_random_uuid(), sample.subscriber_id, target.account_id,
    'ACTIVE', sample.subscription_type
FROM target CROSS JOIN demo_subscribers sample
ON CONFLICT (subscriber_id, target_account_id) DO UPDATE
SET subscription_st = 'ACTIVE',
    subscription_type = EXCLUDED.subscription_type,
    upd_dt = now();

WITH target AS (
    SELECT account_id
    FROM user_profiles
    WHERE account_id NOT IN (
        '20000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000002',
        '20000000-0000-4000-8000-000000000003',
        '20000000-0000-4000-8000-000000000004',
        '20000000-0000-4000-8000-000000000005',
        '30000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000002',
        '30000000-0000-4000-8000-000000000003'
    )
    ORDER BY reg_dt
    LIMIT 1
), demo_subscribers(subscriber_id, subscription_type, term_months, end_dt) AS (
    VALUES
        ('30000000-0000-4000-8000-000000000001'::UUID, 'FREE', NULL::SMALLINT, NULL::TIMESTAMPTZ),
        ('30000000-0000-4000-8000-000000000002'::UUID, 'PAID', 1::SMALLINT, now() + interval '1 month'),
        ('30000000-0000-4000-8000-000000000003'::UUID, 'PAID', 3::SMALLINT, now() + interval '3 months')
)
INSERT INTO user_subscription_history (
    subscription_history_id, subscription_id, subscription_type,
    term_months, period_st, price_amt, start_dt, end_dt
)
SELECT
    gen_random_uuid(), s.subscription_id, sample.subscription_type,
    sample.term_months, 'ACTIVE', 0, now(), sample.end_dt
FROM target
CROSS JOIN demo_subscribers sample
JOIN user_subscriptions s
  ON s.subscriber_id = sample.subscriber_id
 AND s.target_account_id = target.account_id
ON CONFLICT DO NOTHING;

COMMIT;
