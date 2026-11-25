-- 맛다공 프로필은 공개 공유를 전제로 하므로 불필요한 공개 범위 설정을 제거합니다.
ALTER TABLE user_profiles
    DROP CONSTRAINT ck_user_profiles_visibility;

ALTER TABLE user_profiles
    DROP COLUMN profile_visibility;
