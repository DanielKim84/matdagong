-- 기본 캐릭터는 계정마다 하나씩 고정하고, 직접 올린 사진은 DB에 저장해 다른 기기에서도 보여줍니다.
ALTER TABLE user_profiles
    ADD COLUMN avatar_variant SMALLINT NOT NULL DEFAULT 1,
    ADD COLUMN profile_img_data BYTEA,
    ADD COLUMN profile_img_mime_type VARCHAR(32),
    ADD COLUMN profile_cover_data BYTEA,
    ADD COLUMN profile_cover_mime_type VARCHAR(32);

-- 이미 가입한 사용자도 서로 다른 기본 캐릭터를 받도록 최초 한 번 무작위로 배정합니다.
UPDATE user_profiles
SET avatar_variant = (floor(random() * 3) + 1)::SMALLINT;

COMMENT ON COLUMN user_profiles.avatar_variant IS '사용자가 사진을 올리기 전 기본으로 보여줄 맛다공 캐릭터 번호.';
COMMENT ON COLUMN user_profiles.profile_img_data IS '사용자가 올린 원형 프로필 이미지 바이너리.';
COMMENT ON COLUMN user_profiles.profile_img_mime_type IS '원형 프로필 이미지의 MIME 형식.';
COMMENT ON COLUMN user_profiles.profile_cover_data IS '사용자가 올린 프로필 배경 이미지 바이너리.';
COMMENT ON COLUMN user_profiles.profile_cover_mime_type IS '프로필 배경 이미지의 MIME 형식.';
