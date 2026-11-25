-- 얼큰한 국물은 국물과 매운맛 조합으로 표현해 비슷한 태그가 늘어나는 것을 막습니다.
WITH old_tag AS (
    SELECT tag_id FROM taste_tags WHERE tag_name = '얼큰한 국물'
), replacements AS (
    SELECT tag_id, '국물' AS tag_name FROM taste_tags WHERE tag_name = '국물'
    UNION ALL
    SELECT tag_id, '매운맛' AS tag_name FROM taste_tags WHERE tag_name = '매운맛'
)
INSERT INTO user_profile_tags (account_id, tag_id)
SELECT selected.account_id, replacements.tag_id
FROM user_profile_tags selected
JOIN old_tag ON old_tag.tag_id = selected.tag_id
CROSS JOIN replacements
ON CONFLICT DO NOTHING;

WITH old_tag AS (
    SELECT tag_id FROM taste_tags WHERE tag_name = '얼큰한 국물'
), replacements AS (
    SELECT tag_id, '국물' AS tag_name FROM taste_tags WHERE tag_name = '국물'
    UNION ALL
    SELECT tag_id, '매운맛' AS tag_name FROM taste_tags WHERE tag_name = '매운맛'
)
INSERT INTO user_preference_tags (account_id, tag_id, preference_type)
SELECT selected.account_id, replacements.tag_id, selected.preference_type
FROM user_preference_tags selected
JOIN old_tag ON old_tag.tag_id = selected.tag_id
CROSS JOIN replacements
ON CONFLICT DO NOTHING;

DELETE FROM user_profile_tags
WHERE tag_id IN (SELECT tag_id FROM taste_tags WHERE tag_name IN ('얼큰한 국물', '늦은 시간 방문', '늦은시간방문'));
DELETE FROM user_preference_tags
WHERE tag_id IN (SELECT tag_id FROM taste_tags WHERE tag_name IN ('얼큰한 국물', '늦은 시간 방문', '늦은시간방문'));
DELETE FROM taste_tags WHERE tag_name IN ('얼큰한 국물', '늦은 시간 방문', '늦은시간방문');
