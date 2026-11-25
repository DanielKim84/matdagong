-- 태그 연결은 현재 목록 상태만 관리하므로 변경 시각은 저장하지 않습니다.
ALTER TABLE user_profile_tags DROP COLUMN reg_dt;
ALTER TABLE user_preference_tags DROP COLUMN reg_dt;
