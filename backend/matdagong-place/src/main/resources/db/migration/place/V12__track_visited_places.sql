-- 다녀온 곳: 빠른 저장했거나 기록한 적이 있는 장소입니다. 기록을 지워도 남고, 위치 확인 없이 언제든 기록할 수 있습니다.
CREATE TABLE user_place_visits (
    account_id UUID NOT NULL,
    place_id VARCHAR(100) NOT NULL,
    visit_source VARCHAR(12) NOT NULL,
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, place_id),
    CONSTRAINT ck_user_place_visits_source CHECK (visit_source IN ('QUICK_SAVE', 'RECORD', 'HEART'))
);

-- 빠른 저장만 하고 맛다공 장소가 없던 가게는 장소 행을 먼저 만듭니다(기록이 없으면 저장한 사람에게만 보임).
INSERT INTO restaurant_places (
    place_id, provider_code, provider_place_id, place_name, category, address,
    latitude, longitude, provider_phone, provider_url, road_address, lot_address
)
SELECT DISTINCT ON (d.provider_code, d.provider_place_id)
    gen_random_uuid(), d.provider_code, d.provider_place_id, d.place_name, LEFT(COALESCE(d.category, ''), 120),
    d.address, d.latitude, d.longitude, d.provider_phone, d.provider_url, d.road_address, d.lot_address
FROM place_quick_drafts d
ORDER BY d.provider_code, d.provider_place_id, d.reg_dt DESC
ON CONFLICT (provider_code, provider_place_id) DO NOTHING;

-- 지금까지의 기록, 예전 '다녀왔어요' 하트, 빠른 저장을 다녀온 곳으로 옮깁니다. 같은 장소는 기록 → 하트 → 빠른 저장 순서로 하나만 남깁니다.
INSERT INTO user_place_visits (account_id, place_id, visit_source, reg_dt)
SELECT account_id, place_id::text, 'RECORD', reg_dt FROM restaurant_records
ON CONFLICT DO NOTHING;

INSERT INTO user_place_visits (account_id, place_id, visit_source, reg_dt)
SELECT account_id, place_id, 'HEART', reg_dt FROM user_place_likes WHERE save_origin = 'VISITED'
ON CONFLICT DO NOTHING;

INSERT INTO user_place_visits (account_id, place_id, visit_source, reg_dt)
SELECT d.account_id, p.place_id::text, 'QUICK_SAVE', d.reg_dt
FROM place_quick_drafts d
JOIN restaurant_places p ON p.provider_code = d.provider_code AND p.provider_place_id = d.provider_place_id
ON CONFLICT DO NOTHING;

CREATE INDEX idx_user_place_visits_account_date ON user_place_visits(account_id, reg_dt DESC);

COMMENT ON TABLE user_place_visits IS '사용자가 직접 다녀온 장소(빠른 저장·기록). 기록을 지워도 남아 내 지도의 다녀온 곳에 보인다.';
COMMENT ON COLUMN user_place_visits.account_id IS '다녀온 공통 사용자 UUID.';
COMMENT ON COLUMN user_place_visits.place_id IS 'user_place_likes.place_id와 같은 장소 ID(DB 장소 UUID 문자열 또는 샘플 장소 ID).';
COMMENT ON COLUMN user_place_visits.visit_source IS
    '다녀온 근거: QUICK_SAVE는 빠른 저장(빠른 저장을 지우면 함께 빠짐), RECORD는 기록한 적 있음, HEART는 예전 다녀왔어요 하트.';
COMMENT ON COLUMN user_place_visits.reg_dt IS '처음 다녀온 곳이 된 시각.';
