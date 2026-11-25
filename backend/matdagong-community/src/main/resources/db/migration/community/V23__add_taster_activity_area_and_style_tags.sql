-- 맛객이 주로 활동하는 지역·방식을 공개 프로필에 기록하고 관련 태그를 보충합니다.
ALTER TABLE user_profiles
    ADD COLUMN activity_scope VARCHAR(16) NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN activity_region VARCHAR(50),
    ADD CONSTRAINT ck_user_profiles_activity_scope
        CHECK (activity_scope IN ('LOCAL', 'TRAVEL', 'BOTH'));

COMMENT ON COLUMN user_profiles.activity_scope IS '맛객의 활동 범위: 지역 중심, 여행·드라이브, 둘 다.';
COMMENT ON COLUMN user_profiles.activity_region IS '맛객의 주 활동 지역. 예: 서울 마포구.';

INSERT INTO taste_tags (tag_name, tag_category, tag_group, sort_order) VALUES
    ('집밥·가정식', 'MENU', 'CUISINE', 6),
    ('백반', 'MENU', 'CUISINE', 7)
ON CONFLICT (tag_name) DO NOTHING;
