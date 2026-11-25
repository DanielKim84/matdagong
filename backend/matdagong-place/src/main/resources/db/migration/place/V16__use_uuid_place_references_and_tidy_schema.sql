-- 샘플 장소('p-…' ID)를 없앤 뒤(V15) 남은 스키마를 정리합니다.

-- 1) 하트·별로였어요·다녀온 곳·최근 본 곳·제보의 장소 ID를 문자열에서 UUID로 바꾸고 restaurant_places를 가리키는 외래 키를 둡니다.
--    장소 ID는 이제 모두 restaurant_places.place_id라 문자열로 둘 까닭이 없고, 비교할 때마다 place_id::text로 바꾸지 않아도 됩니다.
--    UUID가 아니거나 없는 장소를 가리키는 행은 화면에 보일 수 없는 행이라 먼저 지웁니다(적용 시점 개발 DB에는 없음).
--    가게 행은 지우는 경로가 없어 restaurant_records처럼 ON DELETE 동작은 두지 않습니다.
DELETE FROM user_place_likes x
WHERE NOT EXISTS (SELECT 1 FROM restaurant_places p WHERE p.place_id::text = lower(x.place_id));
DELETE FROM user_place_dislikes x
WHERE NOT EXISTS (SELECT 1 FROM restaurant_places p WHERE p.place_id::text = lower(x.place_id));
DELETE FROM user_place_visits x
WHERE NOT EXISTS (SELECT 1 FROM restaurant_places p WHERE p.place_id::text = lower(x.place_id));
DELETE FROM user_recent_places x
WHERE NOT EXISTS (SELECT 1 FROM restaurant_places p WHERE p.place_id::text = lower(x.place_id));
DELETE FROM place_reports x
WHERE NOT EXISTS (SELECT 1 FROM restaurant_places p WHERE p.place_id::text = lower(x.place_id));

ALTER TABLE user_place_likes
    ALTER COLUMN place_id TYPE UUID USING place_id::uuid,
    ADD CONSTRAINT fk_user_place_likes_place FOREIGN KEY (place_id) REFERENCES restaurant_places(place_id);
ALTER TABLE user_place_dislikes
    ALTER COLUMN place_id TYPE UUID USING place_id::uuid,
    ADD CONSTRAINT fk_user_place_dislikes_place FOREIGN KEY (place_id) REFERENCES restaurant_places(place_id);
ALTER TABLE user_place_visits
    ALTER COLUMN place_id TYPE UUID USING place_id::uuid,
    ADD CONSTRAINT fk_user_place_visits_place FOREIGN KEY (place_id) REFERENCES restaurant_places(place_id);
ALTER TABLE user_recent_places
    ALTER COLUMN place_id TYPE UUID USING place_id::uuid,
    ADD CONSTRAINT fk_user_recent_places_place FOREIGN KEY (place_id) REFERENCES restaurant_places(place_id);
ALTER TABLE place_reports
    ALTER COLUMN place_id TYPE UUID USING place_id::uuid,
    ADD CONSTRAINT fk_place_reports_place FOREIGN KEY (place_id) REFERENCES restaurant_places(place_id);

-- 2) 기록 태그는 저장할 때 늘 분류를 넣고(분류가 없으면 400), 예전처럼 맛(TASTE)으로 채우면 잘못 묶이므로 기본값을 없앱니다.
ALTER TABLE restaurant_record_tags ALTER COLUMN tag_group DROP DEFAULT;

-- 3) 기록 작성자 캐릭터는 저장만 하고 읽지 않습니다. 화면은 작성자 캐릭터·사진을 커뮤니티 프로필에서 채웁니다.
--    칼럼과 함께 ck_restaurant_records_avatar_variant도 지워집니다. 저장된 캐릭터 번호는 사라집니다(복구할 필요 없는 값).
ALTER TABLE restaurant_records DROP COLUMN author_avatar_variant;

-- 4) 계정별 기록 조회는 모두 uk_restaurant_records_owner_place(account_id, place_id)로 끝나고 작성 시각 순으로 읽는 곳이 없어
--    겹치는 색인을 지웁니다.
DROP INDEX idx_restaurant_records_account;

-- 5) 빠른 기록의 draft_id는 어디서도 읽지 않는 대리 키입니다. 한 계정이 한 가게를 한 번만 담으므로
--    (account_id, provider_code, provider_place_id)를 기본 키로 삼고, 같은 칸의 고유 제약은 기본 키로 대신합니다.
ALTER TABLE place_quick_drafts DROP CONSTRAINT place_quick_drafts_pkey;
ALTER TABLE place_quick_drafts DROP COLUMN draft_id;
ALTER TABLE place_quick_drafts
    DROP CONSTRAINT uk_place_quick_drafts_account_provider_place,
    ADD CONSTRAINT place_quick_drafts_pkey PRIMARY KEY (account_id, provider_code, provider_place_id);

-- 6) 바뀐 동작과 어긋나거나 빠진 설명을 채웁니다.
--    매장 이용 조건 이름은 DB CHECK로 묶지 않고 장소 서비스(PlaceRecordModels.VISIT_CONDITIONS)가 검사합니다.
--    이름 목록은 커뮤니티 태그 사전·화면과 함께 바뀌므로 CHECK로 두면 바꿀 때마다 마이그레이션이 필요하고,
--    어긋난 요청이 한국어 400 대신 500(제약 위반)으로 끝나기 때문입니다.
COMMENT ON TABLE restaurant_places IS
    '지도 제공자 장소 ID(provider_code, provider_place_id) 기준으로 하나만 둔 맛집·카페 기본 정보. 여러 맛객의 기록·하트가 함께 가리킨다.';
COMMENT ON COLUMN restaurant_places.place_id IS '맛다공 장소 ID. 화면과 API가 쓰는 장소 ID이고 하트·다녀온 곳·최근 본 곳·제보가 가리킨다.';
COMMENT ON COLUMN restaurant_places.place_name IS '가게 이름. 카카오에서 확인한 값일 때만 갱신한다.';
COMMENT ON COLUMN restaurant_places.category IS '음식 분류(카카오 업종 문자열). 처음 저장한 값을 유지한다.';
COMMENT ON COLUMN restaurant_places.address IS '대표 주소(도로명 주소가 있으면 도로명, 없으면 지번).';
COMMENT ON COLUMN restaurant_places.latitude IS '가게 위도. 다녀온 곳 확인(기기 1km 안)에 쓴다.';
COMMENT ON COLUMN restaurant_places.longitude IS '가게 경도. 다녀온 곳 확인(기기 1km 안)에 쓴다.';
COMMENT ON COLUMN restaurant_places.provider_phone IS '지도 제공자가 알려 준 전화번호.';
COMMENT ON COLUMN restaurant_places.provider_url IS '지도 제공자 장소 페이지 주소(카카오 place.map.kakao.com 형식만 저장).';
COMMENT ON COLUMN restaurant_places.reg_dt IS '가게 행을 처음 만든 시각.';
COMMENT ON COLUMN restaurant_places.upd_dt IS '카카오에서 확인한 값으로 기본 정보를 마지막으로 갱신한 시각.';

COMMENT ON COLUMN restaurant_records.record_id IS '기록 식별자. 메뉴·태그·매장 이용 조건·사진이 가리킨다.';
COMMENT ON COLUMN restaurant_records.place_id IS '기록한 가게(restaurant_places). 한 계정은 가게 하나에 기록 하나만 둔다.';
COMMENT ON COLUMN restaurant_records.author_name IS '기록할 때의 커뮤니티 닉네임. 저장할 때마다 최신 닉네임으로 바꾼다.';
COMMENT ON COLUMN restaurant_records.reason IS '추천 이유(5~500자).';
COMMENT ON COLUMN restaurant_records.reg_dt IS '기록을 처음 남긴 시각. 피드 최신순과 기록 일기 달력에 쓴다.';
COMMENT ON COLUMN restaurant_records.upd_dt IS '기록 내용이나 공개 범위를 마지막으로 바꾼 시각.';

COMMENT ON COLUMN restaurant_record_menus.menu_id IS '메뉴 식별자. 메뉴 사진 주소(/media/place-menu-photos/{menu_id})에 쓴다.';
COMMENT ON COLUMN restaurant_record_menus.record_id IS '메뉴를 남긴 기록.';
COMMENT ON COLUMN restaurant_record_menus.menu_name IS '추천 메뉴 이름.';
COMMENT ON COLUMN restaurant_record_menus.price_amt IS '선택 입력한 가격(원). 비워 둘 수 있다.';
COMMENT ON COLUMN restaurant_record_menus.sort_no IS '기록 안의 메뉴 순서(0부터).';
COMMENT ON COLUMN restaurant_record_menus.photo_mime_type IS '메뉴 사진 형식(image/jpeg, image/png, image/webp). 사진이 없으면 NULL.';

COMMENT ON COLUMN restaurant_record_photos.photo_id IS '사진 식별자. 기록 사진 주소(/media/place-record-photos/{photo_id})에 쓴다.';
COMMENT ON COLUMN restaurant_record_photos.record_id IS '사진을 올린 기록.';
COMMENT ON COLUMN restaurant_record_photos.photo_data IS
    '기록 사진 바이너리(JPEG/PNG/WEBP). 화면이 긴 변 960px 이하로 줄여 올리고, 서버는 한 장 5MB·기록 하나 20MB까지 받는다.';
COMMENT ON COLUMN restaurant_record_photos.mime_type IS '사진 형식(image/jpeg, image/png, image/webp).';
COMMENT ON COLUMN restaurant_record_photos.sort_no IS '기록 안의 사진 순서(0부터). 첫 사진이 대표 사진이다.';
COMMENT ON COLUMN restaurant_record_photos.reg_dt IS '사진을 올린 시각.';

COMMENT ON TABLE restaurant_record_tags IS
    '맛객이 기록에 고른 취향 태그(음식 종류·맛·카페·디저트·여행·분위기·이럴 때). 매장 이용 조건은 restaurant_record_visit_conditions에 따로 둔다.';
COMMENT ON COLUMN restaurant_record_tags.record_id IS '태그를 고른 기록.';
COMMENT ON COLUMN restaurant_record_tags.tag_name IS '태그 이름. 커뮤니티 태그 사전(taste_tags.tag_name)과 같은 이름이다.';

COMMENT ON TABLE restaurant_record_visit_conditions IS
    '직접 방문해 확인한 맛집의 매장 이용 조건. 이름은 커뮤니티 태그 사전의 매장 이용(VISIT) 태그와 같고, '
    '장소 서비스가 저장 전에 정해진 16개 이름(PlaceRecordModels.VISIT_CONDITIONS)인지 검사한다.';
COMMENT ON COLUMN restaurant_record_visit_conditions.record_id IS '조건을 남긴 기록.';
COMMENT ON COLUMN restaurant_record_visit_conditions.condition_name IS '매장 이용 조건 이름(예: 주차 편리, 웨이팅 있는 곳).';

COMMENT ON COLUMN user_place_likes.account_id IS '하트한 공통 사용자 UUID.';
COMMENT ON COLUMN user_place_likes.place_id IS '하트한 장소(restaurant_places.place_id).';
COMMENT ON COLUMN user_place_likes.reg_dt IS '하트한 시각. 하트 목록은 최신순이다.';
COMMENT ON COLUMN user_place_dislikes.place_id IS '별로였다고 남긴 장소(restaurant_places.place_id).';
COMMENT ON COLUMN user_place_visits.place_id IS '다녀온 장소(restaurant_places.place_id).';
COMMENT ON COLUMN user_recent_places.account_id IS '맛집 상세를 연 공통 사용자 UUID.';
COMMENT ON COLUMN user_recent_places.place_id IS '최근 본 장소(restaurant_places.place_id).';
COMMENT ON COLUMN user_recent_places.viewed_at IS '마지막으로 맛집 상세를 연 시각. 15일이 지나면 목록에서 빠지고, 그 사람이 다음에 볼 때 지운다.';

COMMENT ON COLUMN place_reports.report_id IS '제보 식별자.';
COMMENT ON COLUMN place_reports.place_id IS '제보한 장소(restaurant_places.place_id).';
COMMENT ON COLUMN place_reports.account_id IS '제보한 공통 사용자 UUID.';
COMMENT ON COLUMN place_reports.reg_dt IS '제보한 시각.';
COMMENT ON INDEX idx_place_reports_status IS
    '확인 상태별 최신 제보 목록용. 제보를 확인·반영하는 관리자 화면(아직 없음)이 쓸 색인으로, 그때까지는 운영자가 DB에서 조회한다.';
