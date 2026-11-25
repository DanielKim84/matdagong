-- 가게 분류는 제공처가 준 글자 그대로 저장하도록 되돌립니다. V20은 "한식 · 국밥"처럼 줄여 저장했지만, 카카오 분류의
-- 넷째 단계는 가게 이름(프랜차이즈)일 때가 많아 줄이는 규칙이 맞지 않았고, 줄인 값으로는 원래 분류를 되살릴 수 없습니다.
-- 이제 화면(frontend utils/format.ts shortCategory)이 보여 줄 때만 줄입니다. 개발 DB의 줄인 행은 카카오 원본으로 되살렸고,
-- 운영 DB는 아직 없어 데이터를 옮기지 않습니다.
COMMENT ON COLUMN restaurant_places.category IS
    '가게 분류. 제공처가 준 글자 그대로(카카오 "음식점 > 한식 > 국밥") 저장하고 화면에서만 줄인다. 처음 저장한 값을 유지한다.';
COMMENT ON COLUMN place_quick_drafts.category IS
    '빠른 저장한 가게 분류. 제공처가 준 글자 그대로(200자까지). 가게 행(restaurant_places.category, 120자)으로 옮길 때는 120자로 자른다.';
