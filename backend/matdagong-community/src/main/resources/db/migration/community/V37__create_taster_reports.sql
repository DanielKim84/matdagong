-- 맛객 신고입니다. 기록에서 신고해도 그 기록을 올린 맛객에게 쌓고, 어떤 기록이었는지는 place_id로 남깁니다.
-- 같은 사람은 확인 전(PENDING)인 신고를 맛객마다 한 건만 낼 수 있습니다.
CREATE TABLE taster_reports (
    report_id UUID PRIMARY KEY,
    target_account_id UUID NOT NULL REFERENCES user_profiles(account_id) ON DELETE CASCADE,
    reporter_account_id UUID NOT NULL,
    reason VARCHAR(30) NOT NULL,
    memo VARCHAR(500),
    place_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_taster_reports_reason
        CHECK (reason IN ('ILLEGAL_PHOTO', 'ADVERTISING', 'ABUSIVE', 'DEFAMATION', 'IMPERSONATION', 'SPAM', 'OTHER')),
    CONSTRAINT ck_taster_reports_status CHECK (status IN ('PENDING', 'ACTIONED', 'DISMISSED')),
    CONSTRAINT ck_taster_reports_not_self CHECK (target_account_id <> reporter_account_id)
);

CREATE UNIQUE INDEX uk_taster_reports_pending
    ON taster_reports (reporter_account_id, target_account_id) WHERE status = 'PENDING';
CREATE INDEX idx_taster_reports_target_pending
    ON taster_reports (target_account_id, reg_dt DESC) WHERE status = 'PENDING';

COMMENT ON TABLE taster_reports IS '맛객 신고. 관리자 확인 전(PENDING) 신고는 신고한 사람·맛객마다 한 건만 둔다.';
COMMENT ON COLUMN taster_reports.target_account_id IS '신고당한 맛객의 공통 계정 ID. 프로필을 지우면(탈퇴) 함께 지운다.';
COMMENT ON COLUMN taster_reports.reporter_account_id IS '신고한 사람의 공통 계정 ID. 탈퇴하면 그 사람이 낸 신고도 지운다.';
COMMENT ON COLUMN taster_reports.reason IS
    '신고 이유: ILLEGAL_PHOTO(불법·음란 사진), ADVERTISING(광고·홍보), ABUSIVE(욕설·불쾌한 표현), DEFAMATION(비방·사실이 아닌 내용), IMPERSONATION(사칭), SPAM(도배), OTHER(기타).';
COMMENT ON COLUMN taster_reports.memo IS '신고한 사람이 덧붙인 설명. 기타(OTHER)일 때는 꼭 받는다.';
COMMENT ON COLUMN taster_reports.place_id IS '맛집 기록에서 신고했을 때 그 장소 ID. 프로필에서 신고했으면 비어 있다.';
COMMENT ON COLUMN taster_reports.status IS '확인 상태: PENDING(확인 전), ACTIONED(제재함), DISMISSED(문제없음). 관리자 화면에서 바꾼다.';

-- 신고가 쌓인 맛객의 처리 상태입니다. 행이 없으면 신고가 기준에 닿은 적이 없는 맛객입니다.
CREATE TABLE taster_moderations (
    account_id UUID PRIMARY KEY REFERENCES user_profiles(account_id) ON DELETE CASCADE,
    review_requested_at TIMESTAMPTZ,
    hidden_at TIMESTAMPTZ,
    upd_dt TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_taster_moderations_hidden ON taster_moderations (account_id) WHERE hidden_at IS NOT NULL;
CREATE INDEX idx_taster_moderations_review
    ON taster_moderations (review_requested_at DESC) WHERE review_requested_at IS NOT NULL;

COMMENT ON TABLE taster_moderations IS '신고 누적에 따른 맛객 처리 상태. 관리자 확인 목록과 자동 가림을 함께 둔다.';
COMMENT ON COLUMN taster_moderations.review_requested_at IS
    '관리자 확인 목록에 오른 시각. 확인 전 신고가 3명 이상이거나 불법·음란 사진 신고가 1건이라도 있으면 채운다.';
COMMENT ON COLUMN taster_moderations.hidden_at IS
    '자동으로 가린 시각. 확인 전 신고가 5명 이상이면 채우고, 다른 맛객에게 프로필·기록·사진을 보이지 않으며 새 기록을 막는다. 관리자가 풀면 비운다.';
