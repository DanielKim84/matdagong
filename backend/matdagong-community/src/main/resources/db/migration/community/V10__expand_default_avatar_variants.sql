-- 새로고침에도 같은 캐릭터가 유지되도록 계정별 기본 캐릭터를 열 가지 중 하나로 배정합니다.
UPDATE user_profiles
SET avatar_variant = (floor(random() * 10) + 1)::SMALLINT;

ALTER TABLE user_profiles
    ADD CONSTRAINT ck_user_profiles_avatar_variant
    CHECK (avatar_variant BETWEEN 1 AND 10);

COMMENT ON COLUMN user_profiles.avatar_variant IS '사용자가 사진을 올리기 전 기본으로 보여줄 맛다공 캐릭터 번호(1~10).';
