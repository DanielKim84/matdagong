ALTER TABLE restaurant_record_tags
    ADD COLUMN tag_group VARCHAR(20) NOT NULL DEFAULT 'TASTE';

ALTER TABLE restaurant_record_tags
    ADD CONSTRAINT ck_restaurant_record_tags_group
    CHECK (tag_group IN ('CUISINE', 'TASTE', 'CAFE', 'OCCASION'));

UPDATE restaurant_record_tags
SET tag_group = CASE
    WHEN tag_name IN ('한식', '일식', '중식', '양식', '분식', '집밥·가정식', '백반') THEN 'CUISINE'
    WHEN tag_name IN ('커피', '베이커리', '디저트', '차', '케이크', '브런치', '빙수') THEN 'CAFE'
    WHEN tag_name IN ('가성비', '혼밥', '데이트', '가족 외식', '아이와 함께', '어르신과 함께',
                      '조용한 곳', '뷰 좋은 곳', '주차 편리', '단체 모임', '반려동물 동반') THEN 'OCCASION'
    ELSE 'TASTE'
END;

ALTER TABLE restaurant_record_menus
    ADD COLUMN photo_data BYTEA,
    ADD COLUMN photo_mime_type VARCHAR(40),
    ADD CONSTRAINT ck_restaurant_record_menus_photo_mime
      CHECK (photo_mime_type IS NULL OR photo_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    ADD CONSTRAINT ck_restaurant_record_menus_photo_pair
      CHECK ((photo_data IS NULL) = (photo_mime_type IS NULL));

COMMENT ON COLUMN restaurant_record_tags.tag_group IS '맛집 기록 태그 분류: 음식 종류, 맛과 메뉴, 카페·디저트, 방문 스타일.';
COMMENT ON COLUMN restaurant_record_menus.photo_data IS '메뉴별 선택 사진 파일 데이터.';
