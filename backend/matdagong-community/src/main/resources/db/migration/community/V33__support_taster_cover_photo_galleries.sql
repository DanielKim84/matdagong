CREATE TABLE user_profile_cover_photos (
    photo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES user_profiles(account_id) ON DELETE CASCADE,
    photo_data BYTEA NOT NULL,
    mime_type VARCHAR(32) NOT NULL,
    sort_no SMALLINT NOT NULL,
    reg_dt TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_user_profile_cover_photos_mime CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT uk_user_profile_cover_photos_order UNIQUE (account_id, sort_no)
);

INSERT INTO user_profile_cover_photos(account_id, photo_data, mime_type, sort_no)
SELECT account_id, profile_cover_data, profile_cover_mime_type, 0
FROM user_profiles
WHERE profile_cover_data IS NOT NULL AND profile_cover_mime_type IS NOT NULL;

COMMENT ON TABLE user_profile_cover_photos IS '맛객 프로필 상단 배경에 표시할 사진과 순서.';
