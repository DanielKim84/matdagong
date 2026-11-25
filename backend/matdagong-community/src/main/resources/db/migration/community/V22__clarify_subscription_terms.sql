-- 화면과 데이터베이스 설명에서 구독을 팔로우 개념과 분리합니다.
COMMENT ON TABLE user_subscriptions IS '구독자와 맛객 사이의 현재 구독 관계. 무료는 활성 1명까지, 추가 구독은 유료이며 만료 후 재구독할 수 있다.';
COMMENT ON COLUMN user_subscriptions.subscriber_id IS '구독을 신청한 공통 계정 UUID.';
COMMENT ON COLUMN user_subscriptions.target_account_id IS '구독 대상 맛객의 공통 계정 UUID.';
