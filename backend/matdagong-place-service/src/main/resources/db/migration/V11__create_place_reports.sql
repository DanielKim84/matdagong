-- 맛집 기본 정보(가게 이름·주소·전화번호·위치)가 틀렸거나 폐업한 곳을 사용자가 알려 주는 제보입니다.
-- 관리자가 확인해 장소 정보를 고치거나 숨기며, 확인 결과는 status로 남깁니다.
CREATE TABLE place_reports (
    report_id UUID PRIMARY KEY,
    place_id VARCHAR(100) NOT NULL,
    account_id UUID NOT NULL,
    reason VARCHAR(30) NOT NULL,
    memo VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_place_reports_reason
        CHECK (reason IN ('CLOSED', 'WRONG_NAME', 'WRONG_ADDRESS', 'WRONG_PHONE', 'WRONG_LOCATION', 'OTHER')),
    CONSTRAINT ck_place_reports_status CHECK (status IN ('RECEIVED', 'APPLIED', 'REJECTED'))
);

-- 같은 사람이 같은 곳을 같은 이유로 확인 전에 거듭 제보하면 한 건으로 봅니다.
CREATE UNIQUE INDEX uk_place_reports_pending ON place_reports (account_id, place_id, reason) WHERE status = 'RECEIVED';
CREATE INDEX idx_place_reports_status ON place_reports (status, reg_dt DESC);

COMMENT ON TABLE place_reports IS '맛집 기본 정보 오류·폐업 제보와 관리자 확인 결과.';
COMMENT ON COLUMN place_reports.place_id IS 'DB 장소 UUID 문자열 또는 샘플 장소 ID(user_place_likes.place_id와 같은 형식).';
COMMENT ON COLUMN place_reports.reason IS
    '제보 이유: CLOSED(폐업), WRONG_NAME(가게 이름), WRONG_ADDRESS(주소), WRONG_PHONE(전화번호), WRONG_LOCATION(지도 위치), OTHER(기타).';
COMMENT ON COLUMN place_reports.memo IS '사용자가 덧붙인 설명. 기타(OTHER)일 때는 꼭 받습니다.';
COMMENT ON COLUMN place_reports.status IS '확인 상태: RECEIVED(접수), APPLIED(반영), REJECTED(반영 안 함).';
