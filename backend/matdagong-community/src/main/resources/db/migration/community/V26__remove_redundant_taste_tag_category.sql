-- MENU/VISIT 상위 분류는 tag_group에서 계산할 수 있어 중복 저장을 제거합니다.
ALTER TABLE taste_tags
    DROP CONSTRAINT ck_taste_tags_category,
    DROP COLUMN tag_category;

ALTER TABLE taste_tag_requests
    DROP COLUMN tag_category;

COMMENT ON TABLE taste_tags IS '프로필과 추천 취향에서 공통으로 사용하는 태그 사전.';
COMMENT ON COLUMN taste_tags.tag_id IS '태그 번호.';
COMMENT ON COLUMN taste_tags.tag_name IS '화면에 표시할 태그명.';
COMMENT ON COLUMN taste_tags.tag_group IS '태그 그룹: 음식 종류, 맛·메뉴, 카페·디저트, 방문 스타일, 제외 조건.';
COMMENT ON COLUMN taste_tags.sort_order IS '선택 화면의 표시 순서.';

COMMENT ON TABLE taste_tag_requests IS '사용자의 태그 추가 제안과 관리자 검토 결과.';
COMMENT ON COLUMN taste_tag_requests.request_id IS '태그 요청 식별자.';
COMMENT ON COLUMN taste_tag_requests.account_id IS '요청한 사용자 계정 UUID.';
COMMENT ON COLUMN taste_tag_requests.tag_name IS '추가를 제안한 태그명.';
COMMENT ON COLUMN taste_tag_requests.tag_group IS '제안 태그 그룹.';
COMMENT ON COLUMN taste_tag_requests.request_rsn IS '태그가 필요한 이유.';
COMMENT ON COLUMN taste_tag_requests.request_st IS '검토 상태: 대기, 반영 또는 미반영.';
COMMENT ON COLUMN taste_tag_requests.reviewer_id IS '검토를 완료한 관리자 계정 UUID.';
COMMENT ON COLUMN taste_tag_requests.review_note IS '검토 결과 안내.';
COMMENT ON COLUMN taste_tag_requests.review_dt IS '관리자 검토 시각.';
COMMENT ON COLUMN taste_tag_requests.reg_dt IS '요청 접수 시각.';
