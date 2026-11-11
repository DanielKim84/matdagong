-- 하트가 단순 토글(가볼 곳)이 되고 다녀온 곳·별로였던 곳이 따로 생기면서 낡은 테이블·칼럼 설명을 지금 동작에 맞춥니다.
-- 데이터와 제약은 바꾸지 않습니다.
COMMENT ON TABLE user_place_likes IS
    '하트 목록(가볼 곳). 내가 기록한 장소와는 겹치지 않는다. 하트를 풀면 행을 지운다.';
COMMENT ON COLUMN user_place_likes.save_origin IS
    '저장 출처: LIKED는 가볼 곳 하트(지금 새로 만드는 유일한 값). VISITED는 예전 ''다녀왔어요 · 입맛에 맞았어요'' 하트로 '
    '새로 만들지 않지만, 남은 행은 방문 근거·기록 전환·맛객 경험 신뢰의 인정으로 계속 센다.';

COMMENT ON TABLE user_place_dislikes IS
    '직접 다녀왔지만 별로였던 장소(하트를 풀며 ''다녀왔는데 별로였어요''를 고른 곳). 발견·내 지도의 지도 마커에서만 빠지고 '
    '피드·스토리·맛객 프로필에는 그대로 보이며 맛집 상세에 별로였어요 뱃지가 붙는다. 같은 맛집을 인정한 맛객과의 경험 신뢰에서는 엇갈림으로 센다.';
COMMENT ON COLUMN user_place_dislikes.account_id IS '별로였다고 남긴 공통 사용자 UUID.';
COMMENT ON COLUMN user_place_dislikes.reg_dt IS '별로였다고 남긴 시각.';

COMMENT ON TABLE user_place_visits IS
    '사용자가 직접 다녀온 장소(빠른 저장·기록, 예전 다녀왔어요 하트). 기록을 지워도 남아 내 지도의 다녀온 곳에 보이고, '
    '위치 확인 없이 언제든 기록할 수 있다. 만족했는지는 알 수 없어 맛객 경험 신뢰에는 세지 않는다.';

COMMENT ON TABLE place_quick_drafts IS
    '가게 1km 안에서 장소만 먼저 저장하고 나중에 맛집 기록을 이어 쓰는 목록. 저장하면 다녀온 곳(user_place_visits)에도 남고, '
    '기록을 완성하면 이 목록에서 빠진다.';
