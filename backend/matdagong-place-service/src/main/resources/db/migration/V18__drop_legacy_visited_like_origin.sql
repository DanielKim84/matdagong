-- 예전 '다녀왔어요 · 입맛에 맞았어요' 하트(save_origin VISITED)를 없앱니다. 지금 하트는 가볼 곳 한 가지뿐이라
-- 하트의 종류를 나누던 칼럼·제약·색인을 함께 지웁니다. 적용 시점 개발 DB에는 VISITED 행이 없습니다.
-- 예전 하트에서 옮겨 온 다녀온 곳(user_place_visits.visit_source HEART)은 다녀온 기록이라 그대로 둡니다(V12).

DELETE FROM user_place_likes WHERE save_origin <> 'LIKED';

DROP INDEX IF EXISTS idx_user_place_likes_visited_place;
ALTER TABLE user_place_likes DROP CONSTRAINT IF EXISTS ck_user_place_likes_save_origin;
ALTER TABLE user_place_likes DROP COLUMN save_origin;
