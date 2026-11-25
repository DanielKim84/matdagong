-- 하트를 '가 보고 싶어요'와 '다녀왔는데 입맛에 맞았어요'로 나누고, 다녀왔지만 별로였던 장소를 따로 남겨
-- 같은 맛집을 두고 맛객끼리 입맛이 맞았는지(경험 신뢰)를 계산합니다.
CREATE TABLE user_place_dislikes (
    account_id UUID NOT NULL,
    place_id VARCHAR(100) NOT NULL,
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, place_id)
);

CREATE INDEX idx_user_place_dislikes_place ON user_place_dislikes(place_id);
CREATE INDEX idx_user_place_likes_visited_place ON user_place_likes(place_id) WHERE save_origin = 'VISITED';

COMMENT ON TABLE user_place_dislikes IS
    '직접 다녀왔지만 입맛에 맞지 않았던 장소. 지도·내 맛집에는 보이지 않고 맛객 사이 경험 신뢰를 낮추는 데만 쓴다.';
COMMENT ON COLUMN user_place_dislikes.place_id IS 'user_place_likes.place_id와 같은 장소 ID(DB 장소 UUID 문자열 또는 샘플 장소 ID).';
COMMENT ON COLUMN user_place_likes.save_origin IS
    '저장 출처: LIKED는 가 보고 싶어 저장한 하트, VISITED는 직접 다녀와 입맛에 맞았던 하트(내 기록을 내 맛집으로 바꾼 경우 포함).';
