package kr.matdagong.common.tag;

/**
 * 취향 태그의 분류입니다. DB의 tag_group 값과 API JSON 값이 이 이름 그대로입니다.
 * 커뮤니티의 태그 사전과 장소 서비스의 기록 태그가 같은 분류 이름을 씁니다.
 * 화면 이름(label)과 고를 수 있는 수(maxSelections)는 화면의 models/tasteTags.ts와 같게 맞춥니다.
 */
public enum TasteTagGroup {
    /** 식당 분야 */
    CUISINE("음식 종류", 10),
    /** 식당 분야 */
    TASTE("맛·메뉴", 5),
    /** 카페 분야 */
    CAFE("카페 종류", 5),
    /** 카페 분야 */
    DESSERT("디저트·빵", 10),
    /** 모든 분야 */
    TRAVEL("여행·드라이브", 5),
    /** 모든 분야 */
    MOOD("뷰·분위기", 10),
    /** 모든 분야 */
    OCCASION("이럴 때", 5),
    /** 주차·웨이팅처럼 메뉴가 아닌 매장 이용 조건입니다. 기록의 매장 이용 조건과 피하고 싶은 조건에만 씁니다. */
    VISIT("매장 이용", 5);

    private final String label;
    private final int maxSelections;

    TasteTagGroup(String label, int maxSelections) {
        this.label = label;
        this.maxSelections = maxSelections;
    }

    /** 오류 문구에 쓰는 화면 이름입니다. */
    public String label() {
        return label;
    }

    /** 프로필·추천 취향에서 이 분류의 태그를 최대 몇 개까지 고를 수 있는지입니다. */
    public int maxSelections() {
        return maxSelections;
    }

    /** 문자열 분류 값을 enum으로 바꿉니다. 목록에 없는 값이면 null입니다. */
    public static TasteTagGroup fromName(String name) {
        if (name == null) return null;
        for (TasteTagGroup group : values()) {
            if (group.name().equals(name)) return group;
        }
        return null;
    }
}
