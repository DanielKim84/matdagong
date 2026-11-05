package kr.matdagong.common.jdbc;

/**
 * 사용자 검색어를 LIKE·ILIKE 패턴에 넣을 때 쓰는 도우미입니다. 검색어의 %, _ 가 와일드카드로 동작하지 않도록 \ 로
 * 이스케이프하므로, SQL에는 반드시 {@code ILIKE ? ESCAPE '\'}처럼 ESCAPE 절을 함께 씁니다.
 */
public final class LikePatterns {
    private LikePatterns() {}

    /** 검색어를 그대로 포함하는 값을 찾는 패턴("%검색어%")을 만듭니다. */
    public static String contains(String keyword) {
        return "%" + escape(keyword) + "%";
    }

    /** 이스케이프 문자(\)를 먼저 바꿔야 뒤에서 붙인 \ 가 다시 바뀌지 않습니다. */
    public static String escape(String keyword) {
        return keyword.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
