-- 신고 설명은 V38부터 모든 이유에서 꼭 받습니다. V38은 그 전에 받은 설명 없는 신고 때문에 제약을 두지 않았지만,
-- 출시 전이라 그런 신고가 남아 있지 않으므로 빈 설명을 DB에서도 막고 예전 신고를 가리키던 설명을 지웁니다.
ALTER TABLE taster_reports ALTER COLUMN memo SET NOT NULL;
ALTER TABLE taster_reports ADD CONSTRAINT ck_taster_reports_memo CHECK (btrim(memo) <> '');

COMMENT ON COLUMN taster_reports.memo IS '신고한 사람이 덧붙인 설명(500자까지). 운영팀이 확인할 수 있도록 모든 이유에서 꼭 받는다.';
