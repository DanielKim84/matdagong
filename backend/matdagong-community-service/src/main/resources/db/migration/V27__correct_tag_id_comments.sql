-- 태그 연결 테이블의 tag_id는 UUID가 아닌 SMALLINT 태그 번호입니다.
COMMENT ON COLUMN user_profile_tags.tag_id IS '공개 프로필에 연결한 SMALLINT 태그 번호.';
COMMENT ON COLUMN user_preference_tags.tag_id IS '추천 취향에 연결한 SMALLINT 태그 번호.';
