-- 알림 보관·삭제와 신고 처리 설명을 지금 동작에 맞춥니다. 스키마와 데이터는 바꾸지 않습니다.
-- 알림은 사용자가 직접 지울 수 있고(NotificationService.delete·deleteAll), 탈퇴하면 받은 알림과
-- 그 계정을 가리키는 다른 사람의 새 구독자 알림을 함께 지웁니다(WithdrawalService).
COMMENT ON TABLE user_notifications IS '사용자별 알림함. 제목과 내용은 발생 시점에 저장해 장소·기록이 지워져도 남고 90일 보관한다. 사용자가 지우면 지우고, 받는 사람이 탈퇴하면 받은 알림을, 구독한 사람이 탈퇴하면 그 사람을 가리키는 새 구독자 알림을 지운다.';

-- 관리자 화면은 아직 없어 신고 확인·가림 해제는 운영자가 DB에서 직접 처리합니다.
COMMENT ON COLUMN taster_reports.status IS '확인 상태: PENDING(확인 전), ACTIONED(제재함), DISMISSED(문제없음). 앱은 PENDING만 만들고, 관리자 화면이 생기기 전까지는 운영자가 DB에서 바꾼다.';
COMMENT ON COLUMN taster_moderations.hidden_at IS '자동으로 가린 시각. 확인 전 신고가 5명 이상이면 채우고, 다른 맛객에게 프로필·기록·사진을 보이지 않으며 새 기록을 막는다. 가림을 풀 때는 운영자가 DB에서 비운다.';
