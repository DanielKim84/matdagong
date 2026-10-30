-- 한 계정은 같은 장소를 직접 등록한 맛집과 내 맛집으로 동시에 보관하지 않습니다.
DELETE FROM user_place_likes l
USING restaurant_records r
WHERE l.account_id = r.account_id
  AND l.place_id = r.place_id::text;

COMMENT ON TABLE user_place_likes IS '사용자가 직접 등록한 기록과 중복되지 않게 다시 볼 맛집으로 저장한 하트 목록.';
