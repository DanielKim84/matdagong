-- 알림은 원본 맛집 기록과 독립된 스냅샷으로 보관합니다.
CREATE TABLE user_notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_account_id UUID NOT NULL,
    notification_type VARCHAR(32) NOT NULL,
    title VARCHAR(120) NOT NULL,
    message VARCHAR(500) NOT NULL,
    target_type VARCHAR(24),
    target_id VARCHAR(128),
    event_key VARCHAR(160),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
    CONSTRAINT ck_user_notifications_type
        CHECK (notification_type IN ('PLACE_RECORD_CREATED', 'TASTER_NEW_PLACE', 'NEW_SUBSCRIBER', 'SYSTEM_NOTICE')),
    CONSTRAINT ck_user_notifications_title CHECK (btrim(title) <> ''),
    CONSTRAINT ck_user_notifications_message CHECK (btrim(message) <> '')
);

CREATE INDEX idx_user_notifications_recipient_created
    ON user_notifications(recipient_account_id, created_at DESC);
CREATE INDEX idx_user_notifications_recipient_unread
    ON user_notifications(recipient_account_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX idx_user_notifications_expiration
    ON user_notifications(expires_at);
CREATE UNIQUE INDEX uk_user_notifications_recipient_event
    ON user_notifications(recipient_account_id, event_key)
    WHERE event_key IS NOT NULL;

COMMENT ON TABLE user_notifications IS '사용자별 알림함. 제목과 내용은 발생 시점에 저장하며 원본 데이터 삭제와 독립적으로 90일 보관한다.';
COMMENT ON COLUMN user_notifications.recipient_account_id IS '알림을 받는 공통 계정 ID. 인증 DB의 계정 소유권을 유지하기 위해 외래 키를 두지 않는다.';
COMMENT ON COLUMN user_notifications.notification_type IS 'PLACE_RECORD_CREATED, TASTER_NEW_PLACE, NEW_SUBSCRIBER, SYSTEM_NOTICE 중 알림 종류.';
COMMENT ON COLUMN user_notifications.title IS '알림 발생 시점에 저장한 제목 스냅샷.';
COMMENT ON COLUMN user_notifications.message IS '알림 발생 시점에 저장한 안내 내용 스냅샷.';
COMMENT ON COLUMN user_notifications.target_type IS '알림을 눌렀을 때 이동할 화면 종류. 원본과의 외래 키는 두지 않는다.';
COMMENT ON COLUMN user_notifications.target_id IS '이동할 화면의 대상 ID. 원본 대상이 없어져도 알림은 유지한다.';
COMMENT ON COLUMN user_notifications.event_key IS '같은 이벤트 재전송으로 알림이 중복 생성되지 않게 하는 선택 식별자.';
COMMENT ON COLUMN user_notifications.read_at IS '사용자가 알림을 확인한 시각. 읽어도 알림 목록에는 남는다.';
COMMENT ON COLUMN user_notifications.expires_at IS '알림 자동 정리 시각. 기본 보관 기간은 90일.';
