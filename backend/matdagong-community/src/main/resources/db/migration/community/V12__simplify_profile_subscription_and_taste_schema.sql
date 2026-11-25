-- 구독 회차와 프로필 이미지 데이터가 이미 보관하는 중복 값을 제거합니다.
ALTER TABLE user_subscriptions
    DROP CONSTRAINT ck_user_subscriptions_term,
    DROP COLUMN term_months;

ALTER TABLE user_profiles
    DROP COLUMN profile_img_url,
    DROP COLUMN profile_cover_url,
    ADD COLUMN taster_focus VARCHAR(16) NOT NULL DEFAULT 'BOTH',
    ADD COLUMN preference_focus VARCHAR(16) NOT NULL DEFAULT 'BOTH',
    ADD CONSTRAINT ck_user_profiles_taster_focus
        CHECK (taster_focus IN ('RESTAURANT', 'CAFE_DESSERT', 'BOTH')),
    ADD CONSTRAINT ck_user_profiles_preference_focus
        CHECK (preference_focus IN ('RESTAURANT', 'CAFE_DESSERT', 'BOTH'));

-- 취향은 메뉴·맛과 방문 조건으로 묶고, 오래된 탐방 성향 태그는 정리합니다.
ALTER TABLE taste_tags DROP CONSTRAINT ck_taste_tags_category;

DELETE FROM user_profile_tags
WHERE tag_id IN (SELECT tag_id FROM taste_tags WHERE tag_name IN (
    '카페·디저트', '노포', '신상 맛집', '현지인 추천', '숨은 맛집', '빵지순례', '미식 탐방'
));
DELETE FROM user_preference_tags
WHERE tag_id IN (SELECT tag_id FROM taste_tags WHERE tag_name IN (
    '카페·디저트', '노포', '신상 맛집', '현지인 추천', '숨은 맛집', '빵지순례', '미식 탐방'
));
DELETE FROM taste_tags WHERE tag_name IN (
    '카페·디저트', '노포', '신상 맛집', '현지인 추천', '숨은 맛집', '빵지순례', '미식 탐방'
);

UPDATE taste_tags
SET tag_category = CASE
    WHEN tag_category = 'FOOD' THEN 'MENU'
    ELSE 'VISIT'
END;

ALTER TABLE taste_tags
    ADD CONSTRAINT ck_taste_tags_category CHECK (tag_category IN ('MENU', 'VISIT'));

ALTER TABLE user_preference_tags
    ADD COLUMN preference_type VARCHAR(5) NOT NULL DEFAULT 'LIKE',
    ADD CONSTRAINT ck_user_preference_tags_type CHECK (preference_type IN ('LIKE', 'AVOID'));

INSERT INTO taste_tags (tag_name, tag_category, sort_order) VALUES
    ('분식', 'MENU', 10),
    ('순한맛', 'MENU', 11),
    ('국물', 'MENU', 12),
    ('면요리', 'MENU', 13),
    ('커피', 'MENU', 14),
    ('베이커리', 'MENU', 15),
    ('디저트', 'MENU', 16),
    ('아이와 함께', 'VISIT', 20),
    ('어르신과 함께', 'VISIT', 21),
    ('조용한 곳', 'VISIT', 22),
    ('뷰 좋은 곳', 'VISIT', 23),
    ('주차 편리', 'VISIT', 24),
    ('웨이팅 있는 곳', 'VISIT', 25)
ON CONFLICT (tag_name) DO NOTHING;

-- 기존 개발용 맛객에 새 분류의 샘플 태그를 보충합니다.
INSERT INTO user_profile_tags (account_id, tag_id)
SELECT samples.account_id, tag.tag_id
FROM (VALUES
    ('20000000-0000-4000-8000-000000000001'::UUID, '한식'),
    ('20000000-0000-4000-8000-000000000001'::UUID, '국물'),
    ('20000000-0000-4000-8000-000000000002'::UUID, '일식'),
    ('20000000-0000-4000-8000-000000000003'::UUID, '커피'),
    ('20000000-0000-4000-8000-000000000003'::UUID, '데이트'),
    ('20000000-0000-4000-8000-000000000004'::UUID, '가성비'),
    ('20000000-0000-4000-8000-000000000004'::UUID, '가족 외식'),
    ('20000000-0000-4000-8000-000000000005'::UUID, '베이커리'),
    ('20000000-0000-4000-8000-000000000005'::UUID, '디저트')
) AS samples(account_id, tag_name)
JOIN user_profiles profile ON profile.account_id = samples.account_id
JOIN taste_tags tag ON tag.tag_name = samples.tag_name
ON CONFLICT (account_id, tag_id) DO NOTHING;

UPDATE user_profiles
SET taster_focus = CASE account_id
    WHEN '20000000-0000-4000-8000-000000000001'::UUID THEN 'RESTAURANT'
    WHEN '20000000-0000-4000-8000-000000000002'::UUID THEN 'RESTAURANT'
    WHEN '20000000-0000-4000-8000-000000000003'::UUID THEN 'BOTH'
    WHEN '20000000-0000-4000-8000-000000000004'::UUID THEN 'RESTAURANT'
    WHEN '20000000-0000-4000-8000-000000000005'::UUID THEN 'CAFE_DESSERT'
    ELSE taster_focus
END
WHERE account_id IN (
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000005'
);

-- 테이블 설명은 각 테이블의 역할만 짧게 남깁니다.
COMMENT ON TABLE user_profiles IS '맛다공 사용자 프로필과 취향 설정.';
COMMENT ON COLUMN user_profiles.account_id IS '공통 계정 UUID.';
COMMENT ON COLUMN user_profiles.nickname IS '맛다공 표시 이름.';
COMMENT ON COLUMN user_profiles.intro IS '공개 프로필 소개.';
COMMENT ON COLUMN user_profiles.profile_img_data IS '프로필 사진 파일.';
COMMENT ON COLUMN user_profiles.profile_img_mime_type IS '프로필 사진 형식.';
COMMENT ON COLUMN user_profiles.profile_cover_data IS '프로필 배경 파일.';
COMMENT ON COLUMN user_profiles.profile_cover_mime_type IS '프로필 배경 형식.';
COMMENT ON COLUMN user_profiles.avatar_variant IS '기본 캐릭터 번호.';
COMMENT ON COLUMN user_profiles.reg_dt IS '프로필 생성 시각.';
COMMENT ON COLUMN user_profiles.upd_dt IS '프로필 수정 시각.';
COMMENT ON COLUMN user_profiles.taster_focus IS '맛객으로 소개할 분야.';
COMMENT ON COLUMN user_profiles.preference_focus IS '추천받고 싶은 분야.';
COMMENT ON TABLE user_subscriptions IS '사용자와 맛객 간 구독 관계.';
COMMENT ON COLUMN user_subscriptions.subscription_id IS '구독 관계 UUID.';
COMMENT ON COLUMN user_subscriptions.subscriber_id IS '구독자 계정 UUID.';
COMMENT ON COLUMN user_subscriptions.target_account_id IS '맛객 계정 UUID.';
COMMENT ON COLUMN user_subscriptions.subscription_st IS '구독 상태.';
COMMENT ON COLUMN user_subscriptions.subscription_type IS '무료 또는 유료 구독.';
COMMENT ON COLUMN user_subscriptions.reg_dt IS '관계 생성 시각.';
COMMENT ON COLUMN user_subscriptions.upd_dt IS '관계 수정 시각.';
COMMENT ON TABLE user_subscription_periods IS '구독 회차별 기간과 금액 이력.';
COMMENT ON COLUMN user_subscription_periods.subscription_period_id IS '구독 회차 UUID.';
COMMENT ON COLUMN user_subscription_periods.subscription_id IS '구독 관계 UUID.';
COMMENT ON COLUMN user_subscription_periods.subscription_type IS '해당 회차의 무료·유료 구분.';
COMMENT ON COLUMN user_subscription_periods.term_months IS '유료 회차 개월 수.';
COMMENT ON COLUMN user_subscription_periods.period_st IS '회차 이용 상태.';
COMMENT ON COLUMN user_subscription_periods.price_amt IS '회차 결제 금액.';
COMMENT ON COLUMN user_subscription_periods.start_dt IS '이용 시작 시각.';
COMMENT ON COLUMN user_subscription_periods.end_dt IS '이용 종료 시각.';
COMMENT ON COLUMN user_subscription_periods.reg_dt IS '회차 생성 시각.';
COMMENT ON TABLE taste_tags IS '선택 가능한 메뉴·맛 및 방문 조건 태그.';
COMMENT ON COLUMN taste_tags.tag_id IS '태그 번호.';
COMMENT ON COLUMN taste_tags.tag_name IS '화면에 표시할 태그명.';
COMMENT ON COLUMN taste_tags.tag_category IS '태그 분류: MENU 또는 VISIT.';
COMMENT ON COLUMN taste_tags.sort_order IS '화면 표시 순서.';
COMMENT ON TABLE user_profile_tags IS '맛객 프로필에 공개할 태그.';
COMMENT ON COLUMN user_profile_tags.account_id IS '맛객 계정 UUID.';
COMMENT ON COLUMN user_profile_tags.tag_id IS '태그 UUID.';
COMMENT ON COLUMN user_profile_tags.reg_dt IS '태그 등록 시각.';
COMMENT ON TABLE user_preference_tags IS '맛객 추천에 쓰는 개인 취향 태그.';
COMMENT ON COLUMN user_preference_tags.account_id IS '사용자 계정 UUID.';
COMMENT ON COLUMN user_preference_tags.tag_id IS '태그 UUID.';
COMMENT ON COLUMN user_preference_tags.preference_type IS '취향 유형: LIKE 또는 AVOID.';
COMMENT ON COLUMN user_preference_tags.reg_dt IS '취향 등록 시각.';
