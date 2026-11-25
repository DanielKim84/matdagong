-- 추천에 사용할 수 있는 맛 취향 태그 사전입니다. 두 사용자 태그 관계에서 같은 항목을 참조합니다.
CREATE TABLE taste_tags (
    tag_id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tag_name VARCHAR(30) NOT NULL UNIQUE,
    tag_category VARCHAR(20) NOT NULL,
    sort_order SMALLINT NOT NULL,
    CONSTRAINT ck_taste_tags_category CHECK (tag_category IN ('FOOD', 'STYLE', 'DISCOVERY'))
);

INSERT INTO taste_tags (tag_name, tag_category, sort_order) VALUES
    ('한식', 'FOOD', 1),
    ('일식', 'FOOD', 2),
    ('중식', 'FOOD', 3),
    ('양식', 'FOOD', 4),
    ('카페·디저트', 'FOOD', 5),
    ('고기', 'FOOD', 6),
    ('해산물', 'FOOD', 7),
    ('매운맛', 'FOOD', 8),
    ('비건·채식', 'FOOD', 9),
    ('가성비', 'STYLE', 10),
    ('혼밥', 'STYLE', 11),
    ('데이트', 'STYLE', 12),
    ('가족 외식', 'STYLE', 13),
    ('술자리', 'STYLE', 14),
    ('노포', 'DISCOVERY', 15),
    ('신상 맛집', 'DISCOVERY', 16),
    ('현지인 추천', 'DISCOVERY', 17),
    ('숨은 맛집', 'DISCOVERY', 18),
    ('빵지순례', 'DISCOVERY', 19),
    ('미식 탐방', 'DISCOVERY', 20);

-- 공개 프로필에 노출할 맛객의 전문 분야·취향 태그입니다.
CREATE TABLE user_profile_tags (
    account_id UUID NOT NULL REFERENCES user_profiles(account_id) ON DELETE CASCADE,
    tag_id SMALLINT NOT NULL REFERENCES taste_tags(tag_id),
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, tag_id)
);

-- 본인 추천에만 쓰는 선호 태그로, 다른 사용자 프로필에는 노출하지 않습니다.
CREATE TABLE user_preference_tags (
    account_id UUID NOT NULL REFERENCES user_profiles(account_id) ON DELETE CASCADE,
    tag_id SMALLINT NOT NULL REFERENCES taste_tags(tag_id),
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, tag_id)
);

CREATE INDEX idx_user_profile_tags_tag ON user_profile_tags (tag_id, account_id);
CREATE INDEX idx_user_preference_tags_tag ON user_preference_tags (tag_id, account_id);

-- 기존 개발용 테스트 맛객에도 태그를 붙여 새 추천 기능을 바로 확인할 수 있게 합니다.
INSERT INTO user_profile_tags (account_id, tag_id)
SELECT samples.account_id, tag.tag_id
FROM (VALUES
    ('20000000-0000-4000-8000-000000000001'::UUID, '노포'),
    ('20000000-0000-4000-8000-000000000001'::UUID, '한식'),
    ('20000000-0000-4000-8000-000000000001'::UUID, '숨은 맛집'),
    ('20000000-0000-4000-8000-000000000002'::UUID, '일식'),
    ('20000000-0000-4000-8000-000000000002'::UUID, '미식 탐방'),
    ('20000000-0000-4000-8000-000000000003'::UUID, '데이트'),
    ('20000000-0000-4000-8000-000000000003'::UUID, '신상 맛집'),
    ('20000000-0000-4000-8000-000000000003'::UUID, '미식 탐방'),
    ('20000000-0000-4000-8000-000000000004'::UUID, '한식'),
    ('20000000-0000-4000-8000-000000000004'::UUID, '가성비'),
    ('20000000-0000-4000-8000-000000000004'::UUID, '가족 외식'),
    ('20000000-0000-4000-8000-000000000005'::UUID, '카페·디저트'),
    ('20000000-0000-4000-8000-000000000005'::UUID, '빵지순례'),
    ('20000000-0000-4000-8000-000000000005'::UUID, '데이트')
) AS samples(account_id, tag_name)
JOIN user_profiles profile ON profile.account_id = samples.account_id
JOIN taste_tags tag ON tag.tag_name = samples.tag_name
ON CONFLICT (account_id, tag_id) DO NOTHING;

COMMENT ON TABLE taste_tags IS '맛객 프로필과 사용자 취향 추천에 공통으로 사용하는 태그 사전.';
COMMENT ON COLUMN taste_tags.tag_id IS '태그 식별자.';
COMMENT ON COLUMN taste_tags.tag_name IS '화면에서 선택하고 표시할 태그 이름.';
COMMENT ON COLUMN taste_tags.tag_category IS '태그 분류: 음식 종류(FOOD), 식사 방식(STYLE), 탐방 성향(DISCOVERY).';
COMMENT ON COLUMN taste_tags.sort_order IS '선택 화면에서 태그를 보여줄 순서.';

COMMENT ON TABLE user_profile_tags IS '맛객이 공개 프로필에 등록한 음식 분야와 탐방 성향 태그.';
COMMENT ON COLUMN user_profile_tags.account_id IS '맛객 프로필 소유 계정 UUID.';
COMMENT ON COLUMN user_profile_tags.tag_id IS '공개 프로필에 연결한 태그 식별자.';
COMMENT ON COLUMN user_profile_tags.reg_dt IS '프로필 태그를 등록한 시각.';

COMMENT ON TABLE user_preference_tags IS '사용자가 맛객 추천을 받기 위해 선택한 비공개 취향 태그.';
COMMENT ON COLUMN user_preference_tags.account_id IS '취향 태그를 등록한 계정 UUID.';
COMMENT ON COLUMN user_preference_tags.tag_id IS '추천에 사용할 선호 태그 식별자.';
COMMENT ON COLUMN user_preference_tags.reg_dt IS '선호 태그를 등록한 시각.';
