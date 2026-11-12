-- 가게 분류를 한 형식("한식 · 국밥")으로 맞춥니다. 기록은 이 형식으로, 빠른 저장·가볼 곳은 카카오 원래 분류
-- ("음식점 > 한식 > 국밥")로 저장되어 가게마다 모양이 달랐습니다. 이제 서버 PlaceCategories.of가 모든 저장을 맞추고,
-- 옛 행은 같은 규칙(">"로 나눠 "음식점"을 빼고 마지막 두 단계를 " · "로 이음, 남는 게 없으면 "음식점")으로 바꿉니다.
CREATE FUNCTION pg_temp.place_category(raw TEXT) RETURNS TEXT AS $$
    SELECT COALESCE(NULLIF(string_agg(part, ' · ' ORDER BY ord), ''), '음식점')
    FROM (
        SELECT btrim(piece) AS part, ord
        FROM unnest(string_to_array(raw, '>')) WITH ORDINALITY AS pieces(piece, ord)
        WHERE btrim(piece) NOT IN ('', '음식점')
        ORDER BY ord DESC
        LIMIT 2
    ) last_two
$$ LANGUAGE sql IMMUTABLE;

UPDATE restaurant_places SET category = pg_temp.place_category(category) WHERE category LIKE '%>%';
UPDATE place_quick_drafts SET category = pg_temp.place_category(category) WHERE category LIKE '%>%';

COMMENT ON COLUMN restaurant_places.category IS '가게 분류. "한식 · 국밥"처럼 카카오 분류의 마지막 두 단계를 " · "로 잇는다(PlaceCategories). 처음 저장한 값을 유지한다.';
COMMENT ON COLUMN place_quick_drafts.category IS '빠른 저장한 가게 분류. restaurant_places.category와 같은 형식·길이(120자까지)로 저장한다.';
