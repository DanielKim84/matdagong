-- 장소 사업자를 바꿔도 원본 ID namespace와 도로명·지번 주소를 각각 보존합니다.
ALTER TABLE restaurant_places
    ADD COLUMN provider_code VARCHAR(20) NOT NULL DEFAULT 'KAKAO',
    ADD COLUMN road_address VARCHAR(300),
    ADD COLUMN lot_address VARCHAR(300);

ALTER TABLE restaurant_places
    DROP CONSTRAINT IF EXISTS restaurant_places_provider_place_id_key;

ALTER TABLE restaurant_places
    ADD CONSTRAINT uk_restaurant_places_provider_id UNIQUE (provider_code, provider_place_id);

UPDATE restaurant_places SET road_address = address WHERE road_address IS NULL;

ALTER TABLE place_quick_drafts
    ADD COLUMN provider_code VARCHAR(20) NOT NULL DEFAULT 'KAKAO',
    ADD COLUMN road_address VARCHAR(300),
    ADD COLUMN lot_address VARCHAR(300);

ALTER TABLE place_quick_drafts
    DROP CONSTRAINT IF EXISTS uk_place_quick_drafts_account_place;

ALTER TABLE place_quick_drafts
    ADD CONSTRAINT uk_place_quick_drafts_account_provider_place
        UNIQUE (account_id, provider_code, provider_place_id);

UPDATE place_quick_drafts SET road_address = address WHERE road_address IS NULL;

INSERT INTO restaurant_record_tags (record_id, tag_name)
SELECT record_id, '국물' FROM restaurant_record_tags WHERE tag_name = '얼큰한 국물'
ON CONFLICT DO NOTHING;
INSERT INTO restaurant_record_tags (record_id, tag_name)
SELECT record_id, '매운맛' FROM restaurant_record_tags WHERE tag_name = '얼큰한 국물'
ON CONFLICT DO NOTHING;
DELETE FROM restaurant_record_tags WHERE tag_name = '얼큰한 국물';

COMMENT ON COLUMN restaurant_places.provider_code IS '원본 지도 제공자 코드. 예: KAKAO, NAVER.';
COMMENT ON COLUMN restaurant_places.provider_place_id IS '해당 지도 제공자 안에서 장소를 식별하는 원본 ID.';
COMMENT ON COLUMN restaurant_places.road_address IS '지도 제공자가 제공한 도로명 주소.';
COMMENT ON COLUMN restaurant_places.lot_address IS '지도 제공자가 제공한 지번 주소.';
COMMENT ON COLUMN place_quick_drafts.provider_code IS '임시 장소 원본 지도 제공자 코드.';
COMMENT ON COLUMN place_quick_drafts.provider_place_id IS '제공자별 원본 장소 ID.';
COMMENT ON COLUMN place_quick_drafts.road_address IS '검색 결과의 도로명 주소.';
COMMENT ON COLUMN place_quick_drafts.lot_address IS '검색 결과의 지번 주소.';
