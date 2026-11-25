-- 코드와 어긋난 인덱스·제약·기본값·설명을 정리합니다. 데이터는 바꾸지 않습니다.

-- 만료 정리(SubscriptionService.expireEndedSubscriptions)는 목록을 열 때마다 "활성 회차 중 끝난 것"만 찾습니다.
-- (end_dt, period_st) 인덱스는 이미 끝난(EXPIRED·CANCELED) 회차까지 훑으므로 활성 회차만 담는 부분 인덱스로 바꿉니다.
DROP INDEX idx_subscription_history_end_status;
CREATE INDEX idx_subscription_history_active_end
    ON user_subscription_history (end_dt) WHERE period_st = 'ACTIVE';

-- 유료 회차 금액이 0 이상이어야 한다는 제약은 모든 회차에 거는 ck_subscription_history_price와 같아 지웁니다.
ALTER TABLE user_subscription_history DROP CONSTRAINT ck_subscription_history_paid_price;

-- 분류는 저장할 때 늘 정해 넣습니다. 빠뜨리면 맛·메뉴(TASTE)로 조용히 들어가지 않도록 기본값을 없앱니다.
ALTER TABLE taste_tags ALTER COLUMN tag_group DROP DEFAULT;
ALTER TABLE taste_tag_requests ALTER COLUMN tag_group DROP DEFAULT;

-- 자동으로 붙은 CHECK 이름을 다른 제약처럼 ck_<테이블>_<뜻>으로 맞춥니다.
ALTER TABLE taste_tag_requests RENAME CONSTRAINT taste_tag_requests_request_st_check TO ck_taste_tag_requests_status;
ALTER TABLE taste_tag_requests RENAME CONSTRAINT taste_tag_requests_tag_name_check TO ck_taste_tag_requests_name;

-- 태그 사전과 고른 태그
COMMENT ON TABLE taste_tags IS
    '공개 프로필 태그·추천 취향·피하고 싶은 조건이 함께 쓰는 태그 사전. 장소 서비스의 기록 태그·매장 이용 조건은 이 이름(tag_name)과 같게 저장한다.';
COMMENT ON TABLE user_profile_tags IS '맛객이 공개 프로필에 고른 태그. 맛객 분야(taster_focus)에서 고를 수 있는 분류만 둔다.';
COMMENT ON TABLE user_preference_tags IS
    '추천에 쓰는 비공개 취향. LIKE는 추천 분야(preference_focus)에서 고를 수 있는 분류, AVOID(피하고 싶은 조건)는 매장 이용(VISIT) 태그만 둔다.';
COMMENT ON COLUMN user_preference_tags.preference_type IS '취향 유형: LIKE(좋아요, 맛객 취향 % 계산에 씀), AVOID(피하고 싶은 조건).';
COMMENT ON COLUMN taste_tag_requests.request_st IS '검토 상태: PENDING(검토 대기), APPROVED(반영), REJECTED(미반영).';
COMMENT ON COLUMN taste_tag_requests.reviewer_id IS '검토한 관리자 계정 UUID. 관리자 검토 기능을 만들 때 채운다(지금은 비어 있음).';

-- 프로필
COMMENT ON COLUMN user_profiles.intro IS '공개 프로필 소개. 처음 만들 때 기본 소개를 넣고, 사용자가 비우면 NULL.';
COMMENT ON COLUMN user_profiles.avatar_variant IS '프로필 사진이 없을 때 보여 줄 기본 캐릭터 번호(1~10). 처음 만들 때 무작위로 정한다.';
COMMENT ON COLUMN user_profiles.activity_scope IS '맛객의 활동 범위: LOCAL(지역 중심), TRAVEL(여행·드라이브), BOTH(둘 다).';
COMMENT ON COLUMN user_profiles.activity_region IS '맛객의 주 활동 지역(예: 서울 마포구). 활동 범위가 TRAVEL이면 비운다.';
COMMENT ON COLUMN user_profile_cover_photos.photo_id IS '배경 사진 UUID. 사진 주소(/media/profiles/{계정}/covers/{사진})에 쓴다.';
COMMENT ON COLUMN user_profile_cover_photos.account_id IS '배경 사진 주인 맛객의 공통 계정 UUID. 프로필을 지우면 함께 지운다.';
COMMENT ON COLUMN user_profile_cover_photos.photo_data IS '배경 사진 파일(한 장 5MB 이하).';
COMMENT ON COLUMN user_profile_cover_photos.mime_type IS '배경 사진 형식: image/jpeg, image/png, image/webp.';
COMMENT ON COLUMN user_profile_cover_photos.sort_no IS '갤러리 표시 순서. 0부터 빈틈없이 매기고, 0번이 대표 배경이다.';
COMMENT ON COLUMN user_profile_cover_photos.reg_dt IS '배경 사진 등록 시각.';

-- 구독
COMMENT ON COLUMN user_subscription_history.period_st IS
    '회차 상태: PENDING(결제 대기), ACTIVE(이용 중), EXPIRED(기간 만료), CANCELED(취소), FAILED(결제 실패). PENDING·FAILED는 결제 연동 때 쓴다.';

-- 포인트
COMMENT ON COLUMN user_point_history.reference_key IS
    '같은 적립·사용을 두 번 반영하지 않게 하는 업무 키(계정 안에서 유일). 지급·사용 처리를 연결할 때 채운다.';

-- 알림
COMMENT ON COLUMN user_notifications.notification_id IS '알림 UUID.';
COMMENT ON COLUMN user_notifications.notification_type IS
    '알림 종류: PLACE_RECORD_CREATED(내 맛집 등록 완료), TASTER_NEW_PLACE(구독 맛객의 새 공개 기록), NEW_SUBSCRIBER(새 구독자), SYSTEM_NOTICE(운영 안내, 지금은 신고 누적 가림).';
COMMENT ON COLUMN user_notifications.target_type IS
    '알림을 눌렀을 때 이동할 화면: PLACE(장소 상세), MY_SUBSCRIBERS(내 구독자). 비어 있으면 안내만 하는 알림이다.';
COMMENT ON COLUMN user_notifications.created_at IS '알림 생성 시각.';

-- 신고
COMMENT ON COLUMN taster_reports.report_id IS '신고 UUID.';
COMMENT ON COLUMN taster_reports.reg_dt IS '신고 접수 시각.';
COMMENT ON COLUMN taster_moderations.account_id IS '처리 대상 맛객의 공통 계정 UUID. 프로필을 지우면 함께 지운다.';
COMMENT ON COLUMN taster_moderations.upd_dt IS '처리 상태를 마지막으로 바꾼 시각.';
