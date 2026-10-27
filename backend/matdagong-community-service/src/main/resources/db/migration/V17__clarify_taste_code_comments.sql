-- 현재 사용하는 코드와 뜻을 DB 도구에서 함께 확인할 수 있게 설명합니다.
COMMENT ON COLUMN taste_tags.tag_category IS '태그 분류: MENU(메뉴·맛), VISIT(방문 조건).';
COMMENT ON COLUMN user_preference_tags.preference_type IS '취향 유형: LIKE(선호), AVOID(제외).';
COMMENT ON COLUMN user_profiles.taster_focus IS '맛객 소개 분야: RESTAURANT(음식점), CAFE_DESSERT(카페·디저트), BOTH(둘 다).';
COMMENT ON COLUMN user_profiles.preference_focus IS '추천받을 분야: RESTAURANT(음식점), CAFE_DESSERT(카페·디저트), BOTH(둘 다).';
