-- 최근 본 맛집은 계정별로 장소 ID와 마지막 조회 시각을 저장하고 30일 뒤 숨깁니다.
CREATE TABLE user_recent_places (
    account_id UUID NOT NULL,
    place_id VARCHAR(100) NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, place_id)
);

CREATE INDEX idx_user_recent_places_account_viewed
    ON user_recent_places(account_id, viewed_at DESC);

COMMENT ON TABLE user_recent_places IS '사용자별 최근 본 맛집. 상세 화면을 연 시각 기준 30일간 표시한다.';
COMMENT ON COLUMN user_recent_places.place_id IS '장소 서버의 장소 ID 또는 샘플 장소 ID.';
