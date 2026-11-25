-- 2026-11-25 코드 정리: 칼럼 설명을 지금 동작에 맞춥니다(구조는 그대로).
COMMENT ON COLUMN restaurant_records.author_name IS
    '기록을 저장할 때의 커뮤니티 닉네임. 기록을 다시 저장할 때만 바뀌고, 화면은 커뮤니티 프로필의 지금 닉네임을 먼저 쓴다.';
COMMENT ON COLUMN restaurant_record_tags.tag_name IS
    '태그 이름. 화면이 커뮤니티 태그 사전(taste_tags.tag_name)에서 고른 이름을 그대로 저장한다(서버는 분류만 확인).';
COMMENT ON COLUMN restaurant_places.provider_code IS '원본 지도 제공자 코드. 지금은 KAKAO만 쓴다.';
COMMENT ON TABLE place_reports IS '맛집 기본 정보 오류·폐업 제보. 관리자 처리는 다공 공통 관리자(dagong-admin)를 붙일 때 만든다.';
COMMENT ON COLUMN place_reports.status IS
    '확인 상태: RECEIVED(접수), APPLIED(반영), REJECTED(반영 안 함). 관리자 처리 전이라 지금은 RECEIVED만 쓴다.';
