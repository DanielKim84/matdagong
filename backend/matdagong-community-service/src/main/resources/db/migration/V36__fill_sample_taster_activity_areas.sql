-- 샘플 맛객의 활동 범위·지역을 채웁니다. V23에서 컬럼만 추가해 모두 기본값(LOCAL, 지역 없음)이라
-- 맛객 찾기의 지역·여행 칩과 프로필의 활동 지역 칩이 보이지 않았습니다.
-- 사용자가 프로필에서 직접 고친 값은 덮어쓰지 않도록 기본값 그대로인 행만 바꿉니다.
UPDATE user_profiles profile
SET activity_scope = samples.activity_scope,
    activity_region = samples.activity_region,
    upd_dt = now()
FROM (VALUES
    ('20000000-0000-4000-8000-000000000001'::UUID, 'LOCAL', '서울 마포구'),
    ('20000000-0000-4000-8000-000000000002'::UUID, 'BOTH', '서울 마포구'),
    ('20000000-0000-4000-8000-000000000003'::UUID, 'TRAVEL', NULL),
    ('20000000-0000-4000-8000-000000000004'::UUID, 'LOCAL', '서울 마포구'),
    ('20000000-0000-4000-8000-000000000005'::UUID, 'BOTH', '서울 마포구')
) AS samples(account_id, activity_scope, activity_region)
WHERE profile.account_id = samples.account_id
  AND profile.activity_scope = 'LOCAL'
  AND profile.activity_region IS NULL;
