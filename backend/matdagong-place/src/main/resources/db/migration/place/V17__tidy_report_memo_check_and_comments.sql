-- 코드가 이미 지키는 규칙을 제약으로 두고, 제약 이름과 설명을 정리합니다.
-- 적용 시점 개발 DB의 데이터는 모두 새 제약을 지키므로 바뀌는 행이 없습니다.

-- 1) 기타(OTHER) 제보는 설명을 꼭 받습니다(PlaceReportService). 빈 설명은 NULL로 저장하므로 NULL만 막으면 됩니다.
ALTER TABLE place_reports
    ADD CONSTRAINT ck_place_reports_other_memo CHECK (reason <> 'OTHER' OR memo IS NOT NULL);

-- 2) 자동으로 붙은 CHECK 이름을 다른 제약처럼 ck_<테이블>_<뜻>으로 맞춥니다.
ALTER TABLE place_quick_drafts RENAME CONSTRAINT place_quick_drafts_latitude_check TO ck_place_quick_drafts_latitude;
ALTER TABLE place_quick_drafts RENAME CONSTRAINT place_quick_drafts_longitude_check TO ck_place_quick_drafts_longitude;

-- 3) 바뀐 동작과 어긋나거나 빠진 설명을 채웁니다.
COMMENT ON TABLE user_place_likes IS
    '하트 목록(가볼 곳). 내가 기록한 장소, 같은 장소의 별로였던 곳(user_place_dislikes)과는 겹치지 않는다. 하트를 풀면 행을 지운다.';
COMMENT ON COLUMN place_reports.memo IS '사용자가 덧붙인 설명. 기타(OTHER)일 때는 꼭 받는다.';
COMMENT ON COLUMN place_quick_drafts.category IS
    '장소 검색 결과의 업종 분류(200자까지). 가게 행(restaurant_places.category, 120자)으로 옮길 때는 120자로 자른다.';

-- 커뮤니티 DB(V16)처럼 Flyway의 적용 기록도 DB 도구에서 역할을 바로 확인할 수 있게 설명합니다.
COMMENT ON TABLE flyway_schema_history IS 'Flyway 스키마 변경 적용 이력.';
COMMENT ON COLUMN flyway_schema_history.installed_rank IS '마이그레이션 적용 순서.';
COMMENT ON COLUMN flyway_schema_history.version IS '스키마 버전.';
COMMENT ON COLUMN flyway_schema_history.description IS '변경 내용.';
COMMENT ON COLUMN flyway_schema_history.type IS '마이그레이션 유형.';
COMMENT ON COLUMN flyway_schema_history.script IS '실행한 스크립트 이름.';
COMMENT ON COLUMN flyway_schema_history.checksum IS '스크립트 변경 확인용 체크섬.';
COMMENT ON COLUMN flyway_schema_history.installed_by IS '적용한 DB 계정.';
COMMENT ON COLUMN flyway_schema_history.installed_on IS '적용 시각.';
COMMENT ON COLUMN flyway_schema_history.execution_time IS '실행 시간(밀리초).';
COMMENT ON COLUMN flyway_schema_history.success IS '적용 성공 여부.';
