-- 화면 개발용 더미 계정의 커뮤니티 데이터를 모두 지웁니다. 더미 계정은 V11·V12·V36이 넣은 샘플 맛객
-- (20000000-0000-4000-8000-00000000000[1-5])과 개발 시드(seed-incoming-subscribers.sql)가 넣은 구독자
-- (30000000-0000-4000-8000-00000000000[1-3])입니다. 실제 사용자의 데이터는 남기고, 더미 계정과 이어진 구독·알림과
-- 장소 서비스에서 없앤 샘플 장소(UUID가 아닌 'p-…' ID)를 가리키는 알림·신고만 함께 지웁니다.
-- 장소 서비스 DB의 같은 정리는 장소 서비스 V15가 맡습니다. 지우는 순서는 WithdrawalService(회원 탈퇴)와 같습니다.

CREATE TEMPORARY TABLE dummy_accounts (account_id UUID PRIMARY KEY) ON COMMIT DROP;
INSERT INTO dummy_accounts (account_id) VALUES
    ('20000000-0000-4000-8000-000000000001'),
    ('20000000-0000-4000-8000-000000000002'),
    ('20000000-0000-4000-8000-000000000003'),
    ('20000000-0000-4000-8000-000000000004'),
    ('20000000-0000-4000-8000-000000000005'),
    ('30000000-0000-4000-8000-000000000001'),
    ('30000000-0000-4000-8000-000000000002'),
    ('30000000-0000-4000-8000-000000000003');

-- 구독은 양쪽(더미가 구독한 것, 더미를 구독한 것) 모두 지웁니다. 회차 이력은 구독을 CASCADE 없이 참조해 먼저 지웁니다.
DELETE FROM user_subscription_history
WHERE subscription_id IN (
    SELECT subscription_id FROM user_subscriptions
    WHERE subscriber_id IN (SELECT account_id FROM dummy_accounts)
       OR target_account_id IN (SELECT account_id FROM dummy_accounts)
);
DELETE FROM user_subscriptions
WHERE subscriber_id IN (SELECT account_id FROM dummy_accounts)
   OR target_account_id IN (SELECT account_id FROM dummy_accounts);

-- 알림은 받는 사람이 더미이거나, 새 구독자 알림이 더미 구독자를 가리키거나(target_id), 샘플 장소로 이동하는 것을 지웁니다.
DELETE FROM user_notifications
WHERE recipient_account_id IN (SELECT account_id FROM dummy_accounts)
   OR (notification_type = 'NEW_SUBSCRIBER' AND target_type = 'MY_SUBSCRIBERS'
       AND target_id IN (SELECT account_id::text FROM dummy_accounts))
   OR (target_type = 'PLACE' AND target_id LIKE 'p-%');

DELETE FROM user_notification_settings WHERE account_id IN (SELECT account_id FROM dummy_accounts);
DELETE FROM user_point_history WHERE account_id IN (SELECT account_id FROM dummy_accounts);
DELETE FROM taste_tag_requests WHERE account_id IN (SELECT account_id FROM dummy_accounts);

-- 신고는 낸 사람·받은 사람 어느 쪽이든 더미이거나, 샘플 장소의 기록에서 낸 것을 지웁니다.
DELETE FROM taster_reports
WHERE reporter_account_id IN (SELECT account_id FROM dummy_accounts)
   OR target_account_id IN (SELECT account_id FROM dummy_accounts)
   OR place_id LIKE 'p-%';
DELETE FROM taster_moderations WHERE account_id IN (SELECT account_id FROM dummy_accounts);

-- 프로필 태그·추천 취향·배경 사진은 프로필과 함께 CASCADE로 지워집니다.
DELETE FROM user_profiles WHERE account_id IN (SELECT account_id FROM dummy_accounts);
