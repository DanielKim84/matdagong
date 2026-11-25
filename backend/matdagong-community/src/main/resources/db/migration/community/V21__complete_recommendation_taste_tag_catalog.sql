-- 추천 분야별로 자주 쓰이는 취향을 보충합니다. 제외 조건은 장소 등록에서 수집하는 항목만 유지합니다.
INSERT INTO taste_tags (tag_name, tag_category, tag_group, sort_order) VALUES
    ('새콤한 맛', 'MENU', 'TASTE', 22),
    ('짭짤한 맛', 'MENU', 'TASTE', 23),
    ('얼큰한 국물', 'MENU', 'TASTE', 24),
    ('브런치', 'MENU', 'CAFE', 29),
    ('빙수', 'MENU', 'CAFE', 30),
    ('단체 모임', 'VISIT', 'OCCASION', 60),
    ('반려동물 동반', 'VISIT', 'OCCASION', 61),
    ('늦은 시간 방문', 'VISIT', 'OCCASION', 62)
ON CONFLICT (tag_name) DO NOTHING;
