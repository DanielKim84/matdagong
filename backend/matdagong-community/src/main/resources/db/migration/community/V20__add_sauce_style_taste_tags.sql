-- 한식·중식 등의 음식 종류와 별개로 양념 취향도 선택할 수 있도록 태그를 추가합니다.
INSERT INTO taste_tags (tag_name, tag_category, tag_group, sort_order) VALUES
    ('간장 스타일', 'MENU', 'TASTE', 19),
    ('고추장 스타일', 'MENU', 'TASTE', 20),
    ('된장 스타일', 'MENU', 'TASTE', 21)
ON CONFLICT (tag_name) DO NOTHING;
