package kr.matdagong.common.tag;

/**
 * 취향 태그의 세부 그룹입니다. DB의 tag_group 값과 API JSON 값이 이 이름 그대로입니다.
 * 커뮤니티의 태그 사전과 장소 서비스의 기록 태그가 같은 그룹 이름을 씁니다.
 */
public enum TasteTagGroup {
    CUISINE,
    TASTE,
    CAFE,
    OCCASION,
    /** 웨이팅·주차처럼 메뉴가 아닌 방문 조건입니다. */
    VISIT;

    /** 화면의 상위 분류(MENU/VISIT)입니다. 태그 사전은 세부 그룹만 저장하므로 여기서 계산합니다. */
    public TasteTagCategory category() {
        return this == VISIT ? TasteTagCategory.VISIT : TasteTagCategory.MENU;
    }

    /** 문자열 그룹 값을 enum으로 바꿉니다. 목록에 없는 값이면 null입니다. */
    public static TasteTagGroup fromName(String name) {
        if (name == null) return null;
        for (TasteTagGroup group : values()) {
            if (group.name().equals(name)) return group;
        }
        return null;
    }
}
