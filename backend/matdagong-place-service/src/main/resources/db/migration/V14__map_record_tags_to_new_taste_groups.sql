-- 커뮤니티 태그 사전이 새 분류(커뮤니티 V39)로 바뀌어 기록 태그도 맞춥니다. 기록 태그는 이름 문자열로 저장하므로
-- 뜻이 분명한 옛 이름만 새 이름·분류로 옮기고 나머지(간장·고추장·된장 스타일, 뷰 좋은 곳 등)는 지웁니다.
-- 매장 이용 조건이던 '주차 편리'·'반려동물 동반' 태그는 같은 기록의 매장 이용 조건으로 옮깁니다.

INSERT INTO restaurant_record_visit_conditions (record_id, condition_name)
SELECT record_id, tag_name FROM restaurant_record_tags
WHERE tag_name IN ('주차 편리', '반려동물 동반')
ON CONFLICT DO NOTHING;

CREATE TEMPORARY TABLE record_tag_mapping (
    old_name VARCHAR(40) PRIMARY KEY,
    new_name VARCHAR(40) NOT NULL,
    new_group VARCHAR(20) NOT NULL
) ON COMMIT DROP;
INSERT INTO record_tag_mapping (old_name, new_name, new_group) VALUES
    ('한식', '한식', 'CUISINE'),
    ('일식', '일식', 'CUISINE'),
    ('중식', '중식', 'CUISINE'),
    ('양식', '양식', 'CUISINE'),
    ('분식', '분식', 'CUISINE'),
    ('집밥·가정식', '백반·가정식', 'CUISINE'),
    ('백반', '백반·가정식', 'CUISINE'),
    ('비건·채식', '비건·채식', 'CUISINE'),
    ('고기', '고기·구이', 'CUISINE'),
    ('해산물', '해산물·회', 'CUISINE'),
    ('면요리', '면·국수', 'CUISINE'),
    ('매운맛', '매콤·얼큰', 'TASTE'),
    ('순한맛', '순한 맛', 'TASTE'),
    ('국물', '국물이 진한', 'TASTE'),
    ('담백한 맛', '담백한', 'TASTE'),
    ('고소한 맛', '고소한', 'TASTE'),
    ('달콤한 맛', '달콤한', 'TASTE'),
    ('새콤한 맛', '새콤한', 'TASTE'),
    ('짭짤한 맛', '짭짤·감칠맛', 'TASTE'),
    ('가성비', '가성비 좋은', 'TASTE'),
    ('커피', '커피 맛집', 'CAFE'),
    ('베이커리', '베이커리 카페', 'CAFE'),
    ('디저트', '디저트 카페', 'CAFE'),
    ('차', '전통찻집·티하우스', 'CAFE'),
    ('브런치', '브런치 카페', 'CAFE'),
    ('케이크', '케이크', 'DESSERT'),
    ('빙수', '빙수', 'DESSERT'),
    ('조용한 곳', '조용한', 'MOOD'),
    ('술자리', '술 한잔', 'OCCASION'),
    ('혼밥', '혼밥', 'OCCASION'),
    ('데이트', '데이트', 'OCCASION'),
    ('가족 외식', '가족 외식', 'OCCASION'),
    ('아이와 함께', '아이와 함께', 'OCCASION'),
    ('어르신과 함께', '부모님과 함께', 'OCCASION'),
    ('단체 모임', '단체·회식', 'OCCASION');

-- 한 기록의 두 옛 태그가 같은 새 이름이 되면(예: 집밥·가정식, 백반) 기본 키(record_id, tag_name)가 겹치므로 하나만 남깁니다.
CREATE TEMPORARY TABLE mapped_record_tags ON COMMIT DROP AS
SELECT DISTINCT tag.record_id, mapping.new_name AS tag_name, mapping.new_group AS tag_group
FROM restaurant_record_tags tag
JOIN record_tag_mapping mapping ON mapping.old_name = tag.tag_name;

DELETE FROM restaurant_record_tags;

ALTER TABLE restaurant_record_tags DROP CONSTRAINT ck_restaurant_record_tags_group;
ALTER TABLE restaurant_record_tags
    ADD CONSTRAINT ck_restaurant_record_tags_group
        CHECK (tag_group IN ('CUISINE', 'TASTE', 'CAFE', 'DESSERT', 'TRAVEL', 'MOOD', 'OCCASION'));

INSERT INTO restaurant_record_tags (record_id, tag_name, tag_group)
SELECT record_id, tag_name, tag_group FROM mapped_record_tags;

-- 매장 이용 조건은 커뮤니티 태그 사전의 매장 이용(VISIT) 이름과 같아야 화면이 피하고 싶은 조건과 비교할 수 있습니다.
DELETE FROM restaurant_record_visit_conditions
WHERE condition_name NOT IN (
    '주차 편리', '주차 공간 협소', '주차 불가', '예약 권장', '웨이팅 있는 곳', '브레이크타임 있음',
    '늦게까지 영업', '24시간 영업', '반려동물 동반', '노키즈존', '아이 의자 있음', '단체석·룸',
    '테라스·야외석', '포장 가능', '친절 경험', '불친절 경험'
);

COMMENT ON COLUMN restaurant_record_tags.tag_group IS
    '기록 태그 분류(커뮤니티 taste_tags.tag_group과 같은 값, 매장 이용 VISIT은 restaurant_record_visit_conditions에 따로 저장): '
    'CUISINE(음식 종류), TASTE(맛·메뉴), CAFE(카페 종류), DESSERT(디저트·빵), TRAVEL(여행·드라이브), MOOD(뷰·분위기), OCCASION(이럴 때).';
COMMENT ON TABLE restaurant_record_visit_conditions IS
    '직접 방문해 확인한 맛집의 매장 이용 조건. 이름은 커뮤니티 태그 사전의 매장 이용(VISIT) 태그와 같다.';
