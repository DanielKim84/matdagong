-- 취향 태그 분류를 8개(음식 종류·맛·메뉴·카페 종류·디저트·빵·여행·드라이브·뷰·분위기·이럴 때·매장 이용)로 바꾸고
-- 태그 사전을 새 목록으로 다시 채웁니다. 옛 태그와 새 태그는 뜻이 1:1로 맞지 않아, 고른 태그(프로필·추천 취향)는 모두 비우고
-- 사용자가 새 목록에서 다시 고르게 합니다. 분류마다 고를 수 있는 수는 서버 TasteTagGroup.maxSelections가 정합니다.
-- sort_order는 분류 시작값(100, 200 … 800) + 순번이라 분류 안 순서와 분류 순서를 함께 나타냅니다.

-- 새 분류에 없는 제안은 검토할 곳이 없어 지웁니다.
DELETE FROM taste_tag_requests
WHERE tag_group NOT IN ('CUISINE', 'TASTE', 'CAFE', 'DESSERT', 'TRAVEL', 'MOOD', 'OCCASION', 'VISIT');

-- 고른 태그와 태그 사전을 함께 비우고 태그 번호를 1부터 다시 매깁니다.
TRUNCATE user_profile_tags, user_preference_tags, taste_tags RESTART IDENTITY;

ALTER TABLE taste_tags DROP CONSTRAINT ck_taste_tags_group;
ALTER TABLE taste_tags
    ADD CONSTRAINT ck_taste_tags_group
        CHECK (tag_group IN ('CUISINE', 'TASTE', 'CAFE', 'DESSERT', 'TRAVEL', 'MOOD', 'OCCASION', 'VISIT'));

ALTER TABLE taste_tag_requests DROP CONSTRAINT ck_taste_tag_requests_group;
ALTER TABLE taste_tag_requests
    ADD CONSTRAINT ck_taste_tag_requests_group
        CHECK (tag_group IN ('CUISINE', 'TASTE', 'CAFE', 'DESSERT', 'TRAVEL', 'MOOD', 'OCCASION', 'VISIT'));

-- 매장 이용(VISIT) 이름은 장소 서비스 기록의 매장 이용 조건(restaurant_record_visit_conditions)과 같아야 합니다.
-- 화면이 내 피하고 싶은 조건과 기록 조건을 이름으로 비교합니다.
INSERT INTO taste_tags (tag_name, tag_group, sort_order) VALUES
    ('한식', 'CUISINE', 101),
    ('백반·가정식', 'CUISINE', 102),
    ('고기·구이', 'CUISINE', 103),
    ('국밥·탕·찌개', 'CUISINE', 104),
    ('면·국수', 'CUISINE', 105),
    ('해산물·회', 'CUISINE', 106),
    ('일식', 'CUISINE', 107),
    ('돈가스·튀김', 'CUISINE', 108),
    ('중식', 'CUISINE', 109),
    ('양식', 'CUISINE', 110),
    ('피자·버거', 'CUISINE', 111),
    ('아시안', 'CUISINE', 112),
    ('분식', 'CUISINE', 113),
    ('치킨', 'CUISINE', 114),
    ('술집·이자카야', 'CUISINE', 115),
    ('비건·채식', 'CUISINE', 116),
    ('매콤·얼큰', 'TASTE', 201),
    ('순한 맛', 'TASTE', 202),
    ('국물이 진한', 'TASTE', 203),
    ('담백한', 'TASTE', 204),
    ('고소한', 'TASTE', 205),
    ('달콤한', 'TASTE', 206),
    ('새콤한', 'TASTE', 207),
    ('짭짤·감칠맛', 'TASTE', 208),
    ('불향', 'TASTE', 209),
    ('양이 넉넉한', 'TASTE', 210),
    ('재료가 신선한', 'TASTE', 211),
    ('가성비 좋은', 'TASTE', 212),
    ('커피 맛집', 'CAFE', 301),
    ('로스터리', 'CAFE', 302),
    ('베이커리 카페', 'CAFE', 303),
    ('디저트 카페', 'CAFE', 304),
    ('브런치 카페', 'CAFE', 305),
    ('대형 카페', 'CAFE', 306),
    ('전통찻집·티하우스', 'CAFE', 307),
    ('한옥 카페', 'CAFE', 308),
    ('북카페', 'CAFE', 309),
    ('공부·작업하기 좋은', 'CAFE', 310),
    ('테마 카페', 'CAFE', 311),
    ('소금빵', 'DESSERT', 401),
    ('크루아상·페이스트리', 'DESSERT', 402),
    ('베이글', 'DESSERT', 403),
    ('식사빵·바게트', 'DESSERT', 404),
    ('케이크', 'DESSERT', 405),
    ('구움과자', 'DESSERT', 406),
    ('마카롱', 'DESSERT', 407),
    ('타르트·파이', 'DESSERT', 408),
    ('도넛', 'DESSERT', 409),
    ('와플·크로플', 'DESSERT', 410),
    ('빙수', 'DESSERT', 411),
    ('젤라또·아이스크림', 'DESSERT', 412),
    ('떡·전통 디저트', 'DESSERT', 413),
    ('시그니처 음료', 'DESSERT', 414),
    ('드라이브 코스', 'TRAVEL', 501),
    ('가는 길에 들르기 좋은', 'TRAVEL', 502),
    ('여행지 대표 맛집', 'TRAVEL', 503),
    ('현지인 단골집', 'TRAVEL', 504),
    ('향토 음식', 'TRAVEL', 505),
    ('시장 맛집', 'TRAVEL', 506),
    ('바닷가 마을', 'TRAVEL', 507),
    ('섬 여행', 'TRAVEL', 508),
    ('휴게소·국도변', 'TRAVEL', 509),
    ('캠핑·차박 근처', 'TRAVEL', 510),
    ('산책·나들이 코스', 'TRAVEL', 511),
    ('아침 일찍 여는', 'TRAVEL', 512),
    ('오션뷰', 'MOOD', 601),
    ('산·숲 뷰', 'MOOD', 602),
    ('강·호수 뷰', 'MOOD', 603),
    ('논밭·시골 풍경', 'MOOD', 604),
    ('야경', 'MOOD', 605),
    ('노을 명소', 'MOOD', 606),
    ('루프탑', 'MOOD', 607),
    ('통창·탁 트인', 'MOOD', 608),
    ('정원이 예쁜', 'MOOD', 609),
    ('감성 인테리어', 'MOOD', 610),
    ('사진 찍기 좋은', 'MOOD', 611),
    ('노포', 'MOOD', 612),
    ('조용한', 'MOOD', 613),
    ('고급스러운', 'MOOD', 614),
    ('혼밥', 'OCCASION', 701),
    ('혼자 카페', 'OCCASION', 702),
    ('데이트', 'OCCASION', 703),
    ('기념일', 'OCCASION', 704),
    ('가족 외식', 'OCCASION', 705),
    ('아이와 함께', 'OCCASION', 706),
    ('부모님과 함께', 'OCCASION', 707),
    ('친구 모임', 'OCCASION', 708),
    ('단체·회식', 'OCCASION', 709),
    ('해장', 'OCCASION', 710),
    ('술 한잔', 'OCCASION', 711),
    ('접대·상견례', 'OCCASION', 712),
    ('주차 편리', 'VISIT', 801),
    ('주차 공간 협소', 'VISIT', 802),
    ('주차 불가', 'VISIT', 803),
    ('예약 권장', 'VISIT', 804),
    ('웨이팅 있는 곳', 'VISIT', 805),
    ('브레이크타임 있음', 'VISIT', 806),
    ('늦게까지 영업', 'VISIT', 807),
    ('24시간 영업', 'VISIT', 808),
    ('반려동물 동반', 'VISIT', 809),
    ('노키즈존', 'VISIT', 810),
    ('아이 의자 있음', 'VISIT', 811),
    ('단체석·룸', 'VISIT', 812),
    ('테라스·야외석', 'VISIT', 813),
    ('포장 가능', 'VISIT', 814),
    ('친절 경험', 'VISIT', 815),
    ('불친절 경험', 'VISIT', 816);

-- 새 목록에 이미 들어간 이름을 기다리는 제안은 더 검토할 필요가 없습니다.
DELETE FROM taste_tag_requests request
USING taste_tags tag
WHERE request.request_st = 'PENDING' AND lower(request.tag_name) = lower(tag.tag_name);

COMMENT ON COLUMN taste_tags.tag_group IS
    '태그 분류: CUISINE(음식 종류), TASTE(맛·메뉴), CAFE(카페 종류), DESSERT(디저트·빵), TRAVEL(여행·드라이브), '
    'MOOD(뷰·분위기), OCCASION(이럴 때), VISIT(매장 이용 — 기록의 매장 이용 조건과 피하고 싶은 조건).';
COMMENT ON COLUMN taste_tags.sort_order IS '화면 표시 순서. 분류 시작값(CUISINE 100 … VISIT 800) + 분류 안 순번.';
COMMENT ON COLUMN taste_tag_requests.tag_group IS '사용자가 제안한 태그가 속할 분류(taste_tags.tag_group과 같은 값).';
