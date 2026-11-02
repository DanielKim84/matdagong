-- 계정별 알림 수신 설정입니다. 행이 없으면 기본값(구독 맛객 새 기록·새 구독자 받음, 소식·이벤트 받지 않음)으로 봅니다.
CREATE TABLE user_notification_settings (
    account_id UUID PRIMARY KEY,
    notify_taster_new_place BOOLEAN NOT NULL DEFAULT TRUE,
    notify_new_subscriber BOOLEAN NOT NULL DEFAULT TRUE,
    notify_service_news BOOLEAN NOT NULL DEFAULT FALSE,
    upd_dt TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_notification_settings IS '계정별 알림 수신 설정. 행이 없으면 컬럼 기본값으로 본다. 본인 맛집 등록 완료 알림은 설정과 관계없이 보낸다.';
COMMENT ON COLUMN user_notification_settings.account_id IS '설정 소유 공통 계정 ID. 인증 DB의 계정 소유권을 유지하기 위해 외래 키를 두지 않는다.';
COMMENT ON COLUMN user_notification_settings.notify_taster_new_place IS '구독 중인 맛객의 새 공개 기록 알림(TASTER_NEW_PLACE) 수신 여부.';
COMMENT ON COLUMN user_notification_settings.notify_new_subscriber IS '나를 새로 구독한 사람 알림(NEW_SUBSCRIBER) 수신 여부.';
COMMENT ON COLUMN user_notification_settings.notify_service_news IS '맛다공 소식·이벤트 수신 동의 여부. 아직 보내는 곳은 없다.';
COMMENT ON COLUMN user_notification_settings.upd_dt IS '설정을 마지막으로 바꾼 시각.';
