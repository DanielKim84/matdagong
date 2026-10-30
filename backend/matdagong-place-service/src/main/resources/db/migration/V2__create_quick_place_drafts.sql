CREATE TABLE place_quick_drafts (
    draft_id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    provider_place_id VARCHAR(80) NOT NULL,
    place_name VARCHAR(120) NOT NULL,
    category VARCHAR(200),
    address VARCHAR(300) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    provider_phone VARCHAR(40),
    provider_url VARCHAR(500),
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_place_quick_drafts_account_place UNIQUE (account_id, provider_place_id)
);

CREATE INDEX idx_place_quick_drafts_account_date ON place_quick_drafts(account_id, reg_dt DESC);

COMMENT ON TABLE place_quick_drafts IS '사용자가 장소만 먼저 저장하고 나중에 맛집 기록을 이어 쓰는 임시 목록.';
COMMENT ON COLUMN place_quick_drafts.draft_id IS '임시 기록 식별자.';
COMMENT ON COLUMN place_quick_drafts.account_id IS '임시 장소를 저장한 공통 사용자 UUID.';
COMMENT ON COLUMN place_quick_drafts.provider_place_id IS '카카오 장소 고유 ID.';
COMMENT ON COLUMN place_quick_drafts.place_name IS '장소 검색 결과의 상호명.';
COMMENT ON COLUMN place_quick_drafts.category IS '장소 검색 결과의 업종 분류.';
COMMENT ON COLUMN place_quick_drafts.address IS '장소 검색 결과 주소.';
COMMENT ON COLUMN place_quick_drafts.latitude IS '장소 위도.';
COMMENT ON COLUMN place_quick_drafts.longitude IS '장소 경도.';
COMMENT ON COLUMN place_quick_drafts.provider_phone IS '장소 정보 제공자의 전화번호.';
COMMENT ON COLUMN place_quick_drafts.provider_url IS '장소 정보 제공자의 상세 페이지 주소.';
COMMENT ON COLUMN place_quick_drafts.reg_dt IS '임시 장소를 저장한 시각.';
