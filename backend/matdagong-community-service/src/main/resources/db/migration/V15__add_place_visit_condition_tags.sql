-- 사용자가 장소에서 피하고 싶은 조건을 선택할 수 있도록 태그 목록을 보강합니다.
INSERT INTO taste_tags (tag_name, tag_category, sort_order) VALUES
    ('주차 불가', 'VISIT', 26),
    ('주차 공간 협소', 'VISIT', 27),
    ('노키즈존', 'VISIT', 28),
    ('불친절 경험', 'VISIT', 29)
ON CONFLICT (tag_name) DO NOTHING;
