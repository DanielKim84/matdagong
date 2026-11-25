-- 코드가 이미 지키는 규칙을 제약으로 두고, 겹치거나 빠진 인덱스와 설명을 정리합니다.
-- 적용 시점 개발 DB의 데이터는 모두 새 제약을 지키므로 바뀌는 행이 없습니다.

-- 1) 맛객 신고의 장소 ID를 UUID로 바꿉니다. 장소 서비스의 장소 ID는 모두 UUID이고(장소 V16), 신고 요청도 UUID로 받습니다.
--    UUID가 아닌 예전 값은 가리킬 장소가 없어 비웁니다. 장소 DB가 따로라 외래 키는 두지 않습니다.
UPDATE taster_reports SET place_id = NULL
WHERE place_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE taster_reports ALTER COLUMN place_id TYPE UUID USING place_id::uuid;

-- 2) 알림의 이동 대상은 정해진 두 종류만 두고, 종류와 ID를 함께 채우거나 함께 비웁니다.
--    안내성 알림(둘 다 비어 있음)만 한꺼번에 읽음 처리하는 NotificationService.markPassiveRead가 이 규칙에 기댑니다.
ALTER TABLE user_notifications
    ADD CONSTRAINT ck_user_notifications_target_type CHECK (target_type IN ('PLACE', 'MY_SUBSCRIBERS')),
    ADD CONSTRAINT ck_user_notifications_target CHECK ((target_type IS NULL) = (target_id IS NULL));

-- 3) 포인트 원장의 부호를 내역 유형과 맞춥니다(적립은 양수, 사용은 음수, 조정은 어느 쪽이든).
--    지급·사용 처리를 연결하기 전에 잘못된 부호를 미리 막아 둡니다.
ALTER TABLE user_point_history
    ADD CONSTRAINT ck_user_point_history_sign
        CHECK ((event_type <> 'EARN' OR point_amt > 0) AND (event_type <> 'SPEND' OR point_amt < 0));

-- 4) 프로필 사진은 파일과 형식을 함께 두고, 형식은 배경 사진과 같은 세 가지만 받습니다(ProfileImageService.validate).
--    여행 위주(TRAVEL) 맛객은 활동 지역을 저장하지 않습니다(UserProfileService.updateProfile).
ALTER TABLE user_profiles
    ADD CONSTRAINT ck_user_profiles_img_pair CHECK ((profile_img_data IS NULL) = (profile_img_mime_type IS NULL)),
    ADD CONSTRAINT ck_user_profiles_img_mime
        CHECK (profile_img_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    ADD CONSTRAINT ck_user_profiles_travel_region CHECK (activity_scope <> 'TRAVEL' OR activity_region IS NULL);

-- 5) 안 읽은 알림만 담는 인덱스는 받는 사람·시각 인덱스(idx_user_notifications_recipient_created)와 겹칩니다.
--    안 읽은 수는 목록에서 세고, 읽음 처리도 그 사람의 보관 중인 알림만 훑으므로 지웁니다.
DROP INDEX idx_user_notifications_recipient_unread;

-- 6) 구독 회차를 구독마다 찾는 곳(탈퇴 정리, 구독 행을 지울 때의 외래 키 확인)을 위한 인덱스입니다.
--    지금 있는 회차 인덱스는 이용 중·결제 대기 회차만 담습니다.
CREATE INDEX idx_subscription_history_subscription ON user_subscription_history (subscription_id);

-- 7) 관리자 화면이 쓸 인덱스와, 코드 값이 빠졌거나 바뀐 동작과 어긋난 설명을 채웁니다.
COMMENT ON INDEX idx_taste_tag_requests_review_queue IS
    '검토 상태별 접수순 제안 목록용. 제안을 검토하는 관리자 화면(아직 없음)이 쓸 색인으로, 그때까지는 운영자가 DB에서 조회한다.';
COMMENT ON INDEX idx_taster_moderations_review IS
    '관리자 확인 목록(최근에 오른 순)용. 신고를 처리하는 관리자 화면(아직 없음)이 쓸 색인으로, 그때까지는 운영자가 DB에서 조회한다.';

COMMENT ON COLUMN taster_reports.place_id IS
    '맛집 기록에서 신고했을 때 그 장소 UUID(장소 서비스 restaurant_places.place_id). 프로필에서 신고했으면 비어 있다.';

COMMENT ON COLUMN user_notifications.target_id IS
    '이동할 화면의 대상 ID: PLACE는 장소 UUID, MY_SUBSCRIBERS는 구독한 사람의 계정 UUID. target_type과 함께 비운다. '
    '장소가 없어져도 알림은 남기고, 구독한 사람이 탈퇴하면 그 새 구독자 알림은 지운다.';

COMMENT ON TABLE user_point_history IS
    '사용자 포인트 적립과 사용 내역. 잔액은 point_amt의 합이다. 지금은 조회만 있고 지급·사용 처리는 아직 연결하지 않았다(docs/point-security.md).';
COMMENT ON COLUMN user_point_history.event_type IS '내역 유형: EARN(적립, 양수), SPEND(사용, 음수), ADJUST(조정).';

COMMENT ON COLUMN user_profiles.profile_img_data IS '프로필 사진 파일(5MB 이하). 없으면 기본 캐릭터(avatar_variant)를 보여 준다.';
COMMENT ON COLUMN user_profiles.profile_img_mime_type IS '프로필 사진 형식: image/jpeg, image/png, image/webp. 사진이 없으면 NULL.';

COMMENT ON COLUMN user_subscriptions.subscription_st IS '구독 상태: ACTIVE(이용 중), INACTIVE(취소·만료). 다시 구독하면 같은 행을 ACTIVE로 되돌린다.';
COMMENT ON COLUMN user_subscriptions.subscription_type IS '현재 구독 종류: FREE(무료, 한 사람이 한 맛객만), PAID(유료).';
COMMENT ON COLUMN user_subscription_history.subscription_type IS '이 회차의 구독 종류: FREE(무료), PAID(유료).';
COMMENT ON COLUMN user_subscription_history.term_months IS '유료 회차의 이용 개월 수(1·3·6·12). 무료 회차는 NULL.';
