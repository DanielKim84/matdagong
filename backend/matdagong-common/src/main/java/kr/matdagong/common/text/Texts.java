package kr.matdagong.common.text;

/** 요청·외부 응답의 글자 값을 저장하기 전에 정리하고, 알림 문구의 조사를 고르는 도우미입니다. */
public final class Texts {
    private Texts() {}

    /** 받침으로 읽히는 숫자(0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔)입니다. 2·4·5·9는 받침이 없습니다. */
    private static final String DIGITS_WITH_FINAL = "013678";

    /**
     * 낱말 뒤에 붙일 목적격 조사("을"/"를")입니다. 마지막 글자가 한글이면 받침으로, 숫자면 읽는 소리로 고르고,
     * 영문·기호처럼 소리를 정할 수 없으면 "을(를)"로 둡니다. 알림 문구("○○을 등록했어요")가 씁니다.
     */
    public static String objectParticle(String word) {
        String trimmed = word == null ? "" : word.strip();
        if (trimmed.isEmpty()) return "을(를)";
        char last = trimmed.charAt(trimmed.length() - 1);
        if (last >= '가' && last <= '힣') return (last - '가') % 28 == 0 ? "를" : "을";
        if (Character.isDigit(last)) return DIGITS_WITH_FINAL.indexOf(last) >= 0 ? "을" : "를";
        return "을(를)";
    }

    /** 앞뒤 공백을 지우고, 비었거나 공백뿐이면 null로 바꿉니다. 선택 입력 칸을 DB에 NULL로 남길 때 씁니다. */
    public static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
