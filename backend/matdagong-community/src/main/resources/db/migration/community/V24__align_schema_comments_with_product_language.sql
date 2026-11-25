-- 기존 구독(팔로우) 표현을 서비스가 실제로 제공하는 구독 용어로 맞춥니다.
COMMENT ON TABLE user_subscriptions IS '사용자와 맛객 사이의 현재 구독 상태.';
COMMENT ON COLUMN user_subscriptions.subscription_st IS '구독 상태: ACTIVE 또는 INACTIVE.';
COMMENT ON COLUMN user_subscriptions.subscription_type IS '현재 구독 종류: 무료 또는 유료.';

COMMENT ON TABLE user_subscription_history IS '구독 회차별 기간과 요금 이력.';
COMMENT ON COLUMN user_subscription_history.subscription_history_id IS '구독 회차 식별자.';
COMMENT ON COLUMN user_subscription_history.subscription_id IS '사용자와 맛객의 구독 관계 식별자.';
COMMENT ON COLUMN user_subscription_history.subscription_type IS '해당 회차의 무료·유료 구분.';
COMMENT ON COLUMN user_subscription_history.term_months IS '유료 구독 회차의 이용 개월 수.';
COMMENT ON COLUMN user_subscription_history.period_st IS '회차 상태: 대기, 이용 중, 만료, 취소 또는 실패.';
COMMENT ON COLUMN user_subscription_history.price_amt IS '해당 회차에 적용한 구독 요금.';
COMMENT ON COLUMN user_subscription_history.start_dt IS '구독 회차 시작 시각.';
COMMENT ON COLUMN user_subscription_history.end_dt IS '구독 회차 만료 시각. 무료 구독은 기간이 없어 비어 있을 수 있다.';
COMMENT ON COLUMN user_subscription_history.reg_dt IS '구독 회차 생성 시각.';

COMMENT ON TABLE taste_tag_requests IS '사용자의 태그 추가 제안과 검토 결과.';
COMMENT ON COLUMN taste_tag_requests.request_id IS '태그 요청 식별자.';
COMMENT ON COLUMN taste_tag_requests.account_id IS '태그를 제안한 사용자 계정 식별자.';
COMMENT ON COLUMN taste_tag_requests.tag_name IS '추가를 제안한 태그 이름.';
COMMENT ON COLUMN taste_tag_requests.tag_category IS '태그 분류: MENU 또는 VISIT.';
COMMENT ON COLUMN taste_tag_requests.tag_group IS '세부 분류: CUISINE, TASTE, CAFE, OCCASION 또는 VISIT.';
COMMENT ON COLUMN taste_tag_requests.request_rsn IS '태그가 필요한 이유.';
COMMENT ON COLUMN taste_tag_requests.request_st IS '검토 상태: PENDING, APPROVED 또는 REJECTED.';
COMMENT ON COLUMN taste_tag_requests.reviewer_id IS '검토를 완료한 관리자 계정 식별자.';
COMMENT ON COLUMN taste_tag_requests.review_note IS '검토 결과 안내 문구.';
COMMENT ON COLUMN taste_tag_requests.review_dt IS '관리자가 검토한 시각.';
COMMENT ON COLUMN taste_tag_requests.reg_dt IS '요청 접수 시각.';
