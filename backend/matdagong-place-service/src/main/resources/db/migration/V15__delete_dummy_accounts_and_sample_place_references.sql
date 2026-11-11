-- 화면 개발용 더미 계정의 장소 서비스 데이터를 모두 지우고, 코드에서 없앤 샘플 장소(UUID가 아닌 'p-…' ID)를 가리키는 행도
-- 지웁니다. 더미 계정은 커뮤니티 V40과 같습니다(샘플 맛객 20000000-0000-4000-8000-00000000000[1-5],
-- 개발 시드 구독자 30000000-0000-4000-8000-00000000000[1-3]). 실제 사용자의 데이터는 남깁니다.

CREATE TEMPORARY TABLE dummy_accounts (account_id UUID PRIMARY KEY) ON COMMIT DROP;
INSERT INTO dummy_accounts (account_id) VALUES
    ('20000000-0000-4000-8000-000000000001'),
    ('20000000-0000-4000-8000-000000000002'),
    ('20000000-0000-4000-8000-000000000003'),
    ('20000000-0000-4000-8000-000000000004'),
    ('20000000-0000-4000-8000-000000000005'),
    ('30000000-0000-4000-8000-000000000001'),
    ('30000000-0000-4000-8000-000000000002'),
    ('30000000-0000-4000-8000-000000000003');

-- 더미 기록만 있던 가게 행은 기록을 지운 뒤 아무도 가리키지 않으면 함께 지우려고 먼저 모아 둡니다.
CREATE TEMPORARY TABLE dummy_record_places ON COMMIT DROP AS
SELECT DISTINCT place_id FROM restaurant_records
WHERE account_id IN (SELECT account_id FROM dummy_accounts);

-- 메뉴·태그·매장 이용 조건·사진은 기록과 함께 ON DELETE CASCADE로 지워집니다.
DELETE FROM restaurant_records WHERE account_id IN (SELECT account_id FROM dummy_accounts);
DELETE FROM place_quick_drafts WHERE account_id IN (SELECT account_id FROM dummy_accounts);

DELETE FROM user_place_likes
WHERE account_id IN (SELECT account_id FROM dummy_accounts) OR place_id LIKE 'p-%';
DELETE FROM user_place_dislikes
WHERE account_id IN (SELECT account_id FROM dummy_accounts) OR place_id LIKE 'p-%';
DELETE FROM user_place_visits
WHERE account_id IN (SELECT account_id FROM dummy_accounts) OR place_id LIKE 'p-%';
DELETE FROM user_recent_places
WHERE account_id IN (SELECT account_id FROM dummy_accounts) OR place_id LIKE 'p-%';
DELETE FROM place_reports
WHERE account_id IN (SELECT account_id FROM dummy_accounts) OR place_id LIKE 'p-%';

-- 가게 행은 여러 맛객이 함께 쓰므로, 다른 기록·하트·별로였어요·다녀온 곳·최근 본 곳·제보·빠른 저장이 남아 있으면 둡니다.
DELETE FROM restaurant_places p
WHERE p.place_id IN (SELECT place_id FROM dummy_record_places)
  AND NOT EXISTS (SELECT 1 FROM restaurant_records r WHERE r.place_id = p.place_id)
  AND NOT EXISTS (SELECT 1 FROM user_place_likes l WHERE l.place_id = p.place_id::text)
  AND NOT EXISTS (SELECT 1 FROM user_place_dislikes d WHERE d.place_id = p.place_id::text)
  AND NOT EXISTS (SELECT 1 FROM user_place_visits v WHERE v.place_id = p.place_id::text)
  AND NOT EXISTS (SELECT 1 FROM user_recent_places recent WHERE recent.place_id = p.place_id::text)
  AND NOT EXISTS (SELECT 1 FROM place_reports report WHERE report.place_id = p.place_id::text)
  AND NOT EXISTS (
      SELECT 1 FROM place_quick_drafts draft
      WHERE draft.provider_code = p.provider_code AND draft.provider_place_id = p.provider_place_id
  );

-- 샘플 장소가 없어졌으므로 장소 ID 칸 설명에서 샘플 장소 ID를 뺍니다. 칸은 예전처럼 문자열로 둡니다.
COMMENT ON COLUMN user_place_likes.place_id IS '하트한 장소 ID(restaurant_places.place_id UUID 문자열).';
COMMENT ON COLUMN user_place_dislikes.place_id IS 'user_place_likes.place_id와 같은 장소 ID(UUID 문자열).';
COMMENT ON COLUMN user_place_visits.place_id IS 'user_place_likes.place_id와 같은 장소 ID(UUID 문자열).';
COMMENT ON COLUMN user_recent_places.place_id IS 'user_place_likes.place_id와 같은 장소 ID(UUID 문자열).';
COMMENT ON COLUMN place_reports.place_id IS 'user_place_likes.place_id와 같은 장소 ID(UUID 문자열).';
