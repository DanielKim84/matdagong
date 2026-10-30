-- V33에서 배경 사진을 user_profile_cover_photos 갤러리로 옮긴 뒤 코드가 더 이상 읽거나 쓰지 않는
-- 예전 단일 배경 칼럼을 제거합니다.
-- V33 이후 예전 단일 배경 업로드로만 저장되어 갤러리에 없는 배경이 있다면, 지우기 전에 갤러리 첫 사진으로 옮깁니다.
INSERT INTO user_profile_cover_photos (account_id, photo_data, mime_type, sort_no)
SELECT p.account_id, p.profile_cover_data, p.profile_cover_mime_type, 0
FROM user_profiles p
WHERE p.profile_cover_data IS NOT NULL
  AND p.profile_cover_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
  AND NOT EXISTS (SELECT 1 FROM user_profile_cover_photos c WHERE c.account_id = p.account_id);

ALTER TABLE user_profiles
    DROP COLUMN profile_cover_data,
    DROP COLUMN profile_cover_mime_type;
