-- 2026-11-25 코드 정리: 칼럼 설명을 지금 동작에 맞춥니다(구조는 그대로).
COMMENT ON COLUMN taste_tag_requests.tag_name IS '제안한 태그 이름(TAG) 또는 매장 이용 정보 이름(PLACE_INFO).';
COMMENT ON COLUMN taste_tag_requests.request_rsn IS '제안 이유(선택). 관리자 확인용이라 화면에는 다시 보여 주지 않는다.';
COMMENT ON COLUMN taste_tag_requests.review_note IS
    '검토 결과 안내 문구. 다공 공통 관리자(dagong-admin)로 검토할 때 채운다(지금은 비어 있음).';
COMMENT ON COLUMN taste_tag_requests.review_dt IS
    '관리자가 검토한 시각. 다공 공통 관리자(dagong-admin)로 검토할 때 채운다(지금은 비어 있음).';
COMMENT ON COLUMN user_subscription_history.price_amt IS
    '해당 구독 회차에 청구한 금액. 결제 연동 전이라 지금은 유료 플랜도 0원으로 기록한다.';
