-- 포인트는 적립·사용 처리 없이 조회만 있던 원장이라 지웁니다(2026-11-25 서버를 하나로 합치며 정리).
-- 포인트를 붙일 때는 여다공 등 다공 서비스가 함께 쓰는 별도 포인트 서버로 새로 만듭니다(docs/point-security.md).
DROP TABLE IF EXISTS user_point_history;
