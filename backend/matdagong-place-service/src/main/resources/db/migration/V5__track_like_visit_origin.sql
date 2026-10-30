-- 하트 저장과 직접 방문 기록을 구분해 방문 확인 전에는 기록 전환을 막습니다.
ALTER TABLE user_place_likes
    ADD COLUMN save_origin VARCHAR(12) NOT NULL DEFAULT 'LIKED';

ALTER TABLE user_place_likes
    ADD CONSTRAINT ck_user_place_likes_save_origin
        CHECK (save_origin IN ('LIKED', 'VISITED'));

COMMENT ON COLUMN user_place_likes.save_origin IS
    '저장 출처: LIKED는 타인의 장소를 하트로 저장, VISITED는 직접 방문 기록을 내 맛집으로 바꿔 저장.';
