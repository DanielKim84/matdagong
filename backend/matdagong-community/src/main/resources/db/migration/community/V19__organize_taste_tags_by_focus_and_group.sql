-- 메뉴·맛 태그를 세부 그룹으로 나누고 분야 선택에 맞는 태그만 제공할 수 있게 합니다.
ALTER TABLE taste_tags
    ADD COLUMN tag_group VARCHAR(20) NOT NULL DEFAULT 'TASTE';

UPDATE taste_tags
SET tag_group = CASE
    WHEN tag_name IN ('한식', '일식', '중식', '양식', '분식') THEN 'CUISINE'
    WHEN tag_name IN ('커피', '베이커리', '디저트', '차', '케이크') THEN 'CAFE'
    WHEN tag_name IN ('가성비', '혼밥', '데이트', '가족 외식', '아이와 함께', '어르신과 함께',
                      '조용한 곳', '뷰 좋은 곳', '주차 편리') THEN 'OCCASION'
    WHEN tag_name IN ('웨이팅 있는 곳', '주차 불가', '주차 공간 협소', '노키즈존', '불친절 경험') THEN 'VISIT'
    ELSE 'TASTE'
END;

ALTER TABLE taste_tags
    ADD CONSTRAINT ck_taste_tags_group
        CHECK (tag_group IN ('CUISINE', 'TASTE', 'CAFE', 'OCCASION', 'VISIT'));

-- 취향 선택 영역별로 최대 다섯 개씩 고를 수 있도록 새로운 맛·카페 태그를 보충합니다.
INSERT INTO taste_tags (tag_name, tag_category, tag_group, sort_order) VALUES
    ('담백한 맛', 'MENU', 'TASTE', 16),
    ('고소한 맛', 'MENU', 'TASTE', 17),
    ('달콤한 맛', 'MENU', 'TASTE', 18),
    ('차', 'MENU', 'CAFE', 25),
    ('케이크', 'MENU', 'CAFE', 26)
ON CONFLICT (tag_name) DO UPDATE SET tag_group = EXCLUDED.tag_group;

UPDATE taste_tags
SET sort_order = CASE tag_group
    WHEN 'CUISINE' THEN CASE tag_name
        WHEN '한식' THEN 1 WHEN '일식' THEN 2 WHEN '중식' THEN 3
        WHEN '양식' THEN 4 WHEN '분식' THEN 5 ELSE sort_order END
    WHEN 'TASTE' THEN CASE tag_name
        WHEN '고기' THEN 10 WHEN '해산물' THEN 11 WHEN '매운맛' THEN 12
        WHEN '순한맛' THEN 13 WHEN '국물' THEN 14 WHEN '면요리' THEN 15
        WHEN '담백한 맛' THEN 16 WHEN '고소한 맛' THEN 17 WHEN '달콤한 맛' THEN 18
        ELSE sort_order END
    WHEN 'CAFE' THEN CASE tag_name
        WHEN '커피' THEN 20 WHEN '베이커리' THEN 21 WHEN '디저트' THEN 22
        WHEN '차' THEN 23 WHEN '케이크' THEN 24 ELSE sort_order END
    WHEN 'OCCASION' THEN sort_order + 30
    WHEN 'VISIT' THEN sort_order + 50
    ELSE sort_order
END;

-- 예전에는 분야와 무관한 태그를 함께 저장할 수 있었으므로, 선택 분야와 맞지 않는 연결만 정리합니다.
DELETE FROM user_profile_tags selected
USING user_profiles profile, taste_tags tag
WHERE selected.account_id = profile.account_id
  AND selected.tag_id = tag.tag_id
  AND tag.tag_group <> 'VISIT'
  AND NOT (
      profile.taster_focus = 'BOTH'
      OR tag.tag_group = 'OCCASION'
      OR (profile.taster_focus = 'RESTAURANT' AND tag.tag_group IN ('CUISINE', 'TASTE'))
      OR (profile.taster_focus = 'CAFE_DESSERT' AND tag.tag_group = 'CAFE')
  );

DELETE FROM user_preference_tags selected
USING user_profiles profile, taste_tags tag
WHERE selected.account_id = profile.account_id
  AND selected.tag_id = tag.tag_id
  AND selected.preference_type = 'LIKE'
  AND NOT (
      profile.preference_focus = 'BOTH'
      OR tag.tag_group = 'OCCASION'
      OR (profile.preference_focus = 'RESTAURANT' AND tag.tag_group IN ('CUISINE', 'TASTE'))
      OR (profile.preference_focus = 'CAFE_DESSERT' AND tag.tag_group = 'CAFE')
  );

DELETE FROM user_profile_tags selected
USING taste_tags tag
WHERE selected.tag_id = tag.tag_id AND tag.tag_group = 'VISIT';

DELETE FROM user_preference_tags selected
USING taste_tags tag
WHERE selected.tag_id = tag.tag_id AND selected.preference_type = 'AVOID' AND tag.tag_group <> 'VISIT';

ALTER TABLE taste_tag_requests
    ADD COLUMN tag_group VARCHAR(20) NOT NULL DEFAULT 'TASTE';

UPDATE taste_tag_requests
SET tag_group = CASE tag_category WHEN 'VISIT' THEN 'VISIT' ELSE 'TASTE' END;

ALTER TABLE taste_tag_requests
    ADD CONSTRAINT ck_taste_tag_requests_group
        CHECK (tag_group IN ('CUISINE', 'TASTE', 'CAFE', 'OCCASION', 'VISIT'));

COMMENT ON COLUMN taste_tags.tag_group IS '세부 태그 묶음: 음식 종류, 맛·메뉴, 카페·디저트, 방문 스타일, 제외 조건.';
COMMENT ON COLUMN taste_tag_requests.tag_group IS '사용자가 제안한 태그가 속할 세부 태그 묶음.';
