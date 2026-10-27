CREATE TABLE taste_tag_requests (
    request_id UUID PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES user_profiles(account_id),
    tag_name VARCHAR(30) NOT NULL CHECK (length(btrim(tag_name)) > 0),
    tag_category VARCHAR(20) NOT NULL CHECK (tag_category IN ('MENU', 'VISIT')),
    request_rsn VARCHAR(300),
    request_st VARCHAR(12) NOT NULL DEFAULT 'PENDING'
        CHECK (request_st IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewer_id UUID,
    review_note VARCHAR(300),
    review_dt TIMESTAMPTZ,
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 같은 사용자의 동일한 대기 요청만 막고, 다른 사용자의 수요는 별도로 보관합니다.
CREATE UNIQUE INDEX uk_taste_tag_requests_pending
    ON taste_tag_requests (account_id, lower(tag_name)) WHERE request_st = 'PENDING';
CREATE INDEX idx_taste_tag_requests_account_date ON taste_tag_requests (account_id, reg_dt DESC);
CREATE INDEX idx_taste_tag_requests_review_queue ON taste_tag_requests (request_st, reg_dt);

COMMENT ON TABLE taste_tag_requests IS '사용자의 취향 태그 추가 요청과 관리자 검토 결과.';
COMMENT ON COLUMN taste_tag_requests.request_id IS '태그 요청 번호.';
COMMENT ON COLUMN taste_tag_requests.account_id IS '요청한 사용자 계정 UUID.';
COMMENT ON COLUMN taste_tag_requests.tag_name IS '추가를 원하는 태그명.';
COMMENT ON COLUMN taste_tag_requests.tag_category IS '요청 분류: MENU(메뉴·맛), VISIT(방문 조건).';
COMMENT ON COLUMN taste_tag_requests.request_rsn IS '태그가 필요한 이유.';
COMMENT ON COLUMN taste_tag_requests.request_st IS '처리 상태: PENDING(검토 대기), APPROVED(반영), REJECTED(미반영).';
COMMENT ON COLUMN taste_tag_requests.reviewer_id IS '검토한 관리자 계정 UUID.';
COMMENT ON COLUMN taste_tag_requests.review_note IS '사용자에게 안내할 검토 결과.';
COMMENT ON COLUMN taste_tag_requests.review_dt IS '관리자 검토 시각.';
COMMENT ON COLUMN taste_tag_requests.reg_dt IS '요청 접수 시각.';
