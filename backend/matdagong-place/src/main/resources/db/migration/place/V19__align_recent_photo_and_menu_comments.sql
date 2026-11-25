-- 최근 본 곳·사진·메뉴 이름 설명을 지금 서버 규칙에 맞춥니다. 스키마와 데이터는 바꾸지 않습니다.
-- 최근 본 곳은 15일·최대 30곳(RecentPlaceService), 사진 합계 20MB는 한 번 저장할 때 새로 올린
-- 기록·메뉴 사진만 셉니다(PlaceRecordContentWriter.validate). 메뉴 이름은 화면·서버 모두 30자까지 받습니다.
COMMENT ON TABLE user_recent_places IS '사용자별 최근 본 맛집. 상세 화면을 연 시각 기준 15일간, 최근 30곳까지 표시한다.';
COMMENT ON COLUMN restaurant_record_photos.photo_data IS '기록 사진 바이너리(JPEG/PNG/WEBP). 화면이 긴 변 960px 이하로 줄여 올리고, 서버는 한 장 5MB, 한 번 저장할 때 새로 올린 기록·메뉴 사진 합계 20MB까지 받는다.';
COMMENT ON COLUMN restaurant_record_menus.menu_name IS '추천 메뉴 이름. 화면·서버 검증은 30자까지이고 칼럼 길이(60)는 저장 상한이다.';
