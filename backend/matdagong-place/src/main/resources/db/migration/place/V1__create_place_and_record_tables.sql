-- 카카오 장소 정보와 맛객 개인 기록을 분리해 한 장소에 여러 추천 기록을 연결합니다.
CREATE TABLE restaurant_places (
    place_id UUID PRIMARY KEY,
    provider_place_id VARCHAR(80) NOT NULL UNIQUE,
    place_name VARCHAR(120) NOT NULL,
    category VARCHAR(120) NOT NULL,
    address VARCHAR(300) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    provider_phone VARCHAR(40),
    provider_url VARCHAR(500),
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    upd_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_restaurant_places_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_restaurant_places_longitude CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE restaurant_records (
    record_id UUID PRIMARY KEY,
    place_id UUID NOT NULL REFERENCES restaurant_places(place_id),
    account_id UUID NOT NULL,
    author_name VARCHAR(30) NOT NULL,
    author_avatar_variant SMALLINT NOT NULL DEFAULT 1,
    reason VARCHAR(500) NOT NULL,
    visibility VARCHAR(8) NOT NULL DEFAULT 'PRIVATE',
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    upd_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_restaurant_records_owner_place UNIQUE (account_id, place_id),
    CONSTRAINT ck_restaurant_records_visibility CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
    CONSTRAINT ck_restaurant_records_avatar_variant CHECK (author_avatar_variant BETWEEN 1 AND 10)
);

CREATE INDEX idx_restaurant_records_place_visibility
    ON restaurant_records(place_id, visibility, reg_dt DESC);
CREATE INDEX idx_restaurant_records_account
    ON restaurant_records(account_id, reg_dt DESC);

CREATE TABLE restaurant_record_menus (
    menu_id UUID PRIMARY KEY,
    record_id UUID NOT NULL REFERENCES restaurant_records(record_id) ON DELETE CASCADE,
    menu_name VARCHAR(60) NOT NULL,
    price_amt INTEGER,
    sort_no SMALLINT NOT NULL,
    CONSTRAINT ck_restaurant_record_menus_price CHECK (price_amt IS NULL OR price_amt >= 0),
    CONSTRAINT uk_restaurant_record_menus_order UNIQUE (record_id, sort_no)
);

CREATE TABLE restaurant_record_tags (
    record_id UUID NOT NULL REFERENCES restaurant_records(record_id) ON DELETE CASCADE,
    tag_name VARCHAR(40) NOT NULL,
    PRIMARY KEY(record_id, tag_name)
);

CREATE TABLE restaurant_record_visit_conditions (
    record_id UUID NOT NULL REFERENCES restaurant_records(record_id) ON DELETE CASCADE,
    condition_name VARCHAR(40) NOT NULL,
    PRIMARY KEY(record_id, condition_name)
);

CREATE TABLE restaurant_record_photos (
    photo_id UUID PRIMARY KEY,
    record_id UUID NOT NULL REFERENCES restaurant_records(record_id) ON DELETE CASCADE,
    photo_data BYTEA NOT NULL,
    mime_type VARCHAR(40) NOT NULL,
    sort_no SMALLINT NOT NULL,
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_restaurant_record_photos_mime CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT uk_restaurant_record_photos_order UNIQUE (record_id, sort_no)
);

CREATE TABLE user_place_likes (
    account_id UUID NOT NULL,
    place_id VARCHAR(100) NOT NULL,
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(account_id, place_id)
);

COMMENT ON TABLE restaurant_places IS '지도 사업자 ID 기준으로 중복을 합친 맛집과 카페 장소 정보.';
COMMENT ON TABLE restaurant_records IS '맛객이 장소마다 남긴 추천 이유와 공개 범위.';
COMMENT ON TABLE restaurant_record_menus IS '맛객별 추천 메뉴와 선택 입력한 가격.';
COMMENT ON TABLE restaurant_record_tags IS '맛객별 장소의 음식·맛 태그.';
COMMENT ON TABLE restaurant_record_visit_conditions IS '직접 방문해 확인한 맛집의 방문 조건.';
COMMENT ON TABLE restaurant_record_photos IS '맛객 기록에 등록한 이미지 파일과 표시 순서.';
COMMENT ON TABLE user_place_likes IS '사용자가 다시 볼 맛집으로 저장한 하트 목록.';

COMMENT ON COLUMN restaurant_places.provider_place_id IS '카카오 장소 고유 ID. 같은 장소의 맛객 기록을 묶는 기준.';
COMMENT ON COLUMN restaurant_records.account_id IS 'dagong-auth 공통 계정 UUID. 인증 DB와 서비스 간 외래 키는 두지 않는다.';
COMMENT ON COLUMN restaurant_records.visibility IS '기록 공개 범위: PRIVATE는 본인만, PUBLIC은 다른 사용자에게 공개.';
COMMENT ON COLUMN restaurant_record_photos.photo_data IS '960px 이하 JPEG/PNG/WEBP 이미지 바이너리.';
