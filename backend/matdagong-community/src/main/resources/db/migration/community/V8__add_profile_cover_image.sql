-- 원형 프로필 사진과 구분되는 맛객 프로필 배경 이미지를 저장합니다.
ALTER TABLE user_profiles
    ADD COLUMN profile_cover_url VARCHAR(500);

COMMENT ON COLUMN user_profiles.profile_cover_url IS '맛객 프로필 상단 배경 이미지의 저장소 URL.';
