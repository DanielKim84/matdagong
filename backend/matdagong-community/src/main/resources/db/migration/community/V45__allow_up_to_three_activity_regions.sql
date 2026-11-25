-- 맛객 활동 지역을 한 곳에서 최대 3곳으로 늘립니다(프로필 편집 보드 15-01 "활동 지역 · 최대 3개").
-- 지역은 시·도만("서울특별시"), 시·군·구까지("서울특별시 마포구"), 읍·면·동까지("서울특별시 마포구 연남동") 모두 될 수 있고,
-- 법정동 목록(frontend public/data/kr-legal-dong.json)의 공식 이름을 공백으로 이은 한 줄입니다. 지금 있던 한 곳은 첫 번째로 옮깁니다.
ALTER TABLE user_profiles
    ADD COLUMN activity_regions VARCHAR(50)[] NOT NULL DEFAULT '{}';

UPDATE user_profiles
SET activity_regions = ARRAY[activity_region]
WHERE activity_region IS NOT NULL AND btrim(activity_region) <> '';

ALTER TABLE user_profiles
    DROP CONSTRAINT ck_user_profiles_travel_region,
    DROP COLUMN activity_region,
    ADD CONSTRAINT ck_user_profiles_activity_regions
        CHECK (cardinality(activity_regions) <= 3 AND (activity_scope <> 'TRAVEL' OR cardinality(activity_regions) = 0));

COMMENT ON COLUMN user_profiles.activity_regions IS
    '맛객의 활동 지역(최대 3곳, 고른 순서). 예: {서울특별시 마포구 연남동, 서울특별시}. 활동 범위가 TRAVEL이면 비운다.';
