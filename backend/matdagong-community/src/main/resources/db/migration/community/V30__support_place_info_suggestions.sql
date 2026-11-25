-- 태그와 매장 이용 정보 제안을 한 검토함과 사용자 이력에서 구분합니다.
ALTER TABLE taste_tag_requests
    ADD COLUMN request_type VARCHAR(20) NOT NULL DEFAULT 'TAG',
    ADD CONSTRAINT ck_taste_tag_requests_type CHECK (request_type IN ('TAG', 'PLACE_INFO'));

DROP INDEX uk_taste_tag_requests_pending;
CREATE UNIQUE INDEX uk_taste_tag_requests_pending
    ON taste_tag_requests (account_id, request_type, lower(tag_name)) WHERE request_st = 'PENDING';

COMMENT ON COLUMN taste_tag_requests.request_type IS '제안 종류: TAG(취향 태그), PLACE_INFO(매장 이용 정보).';
COMMENT ON TABLE taste_tag_requests IS '사용자의 취향 태그·매장 이용 정보 제안과 관리자 검토 결과.';

-- 늦은 시간 방문은 방문 스타일 태그에서 관리하지 않고 영업 정보 항목으로 기록합니다.
DELETE FROM user_profile_tags
WHERE tag_id IN (SELECT tag_id FROM taste_tags WHERE tag_name = '늦은 시간 방문');
DELETE FROM user_preference_tags
WHERE tag_id IN (SELECT tag_id FROM taste_tags WHERE tag_name = '늦은 시간 방문');
DELETE FROM taste_tags WHERE tag_name = '늦은 시간 방문';
