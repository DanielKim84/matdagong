package kr.matdagong.common.text;

/** 요청·외부 응답의 글자 값을 저장하기 전에 정리하는 도우미입니다. */
public final class Texts {
    private Texts() {}

    /** 앞뒤 공백을 지우고, 비었거나 공백뿐이면 null로 바꿉니다. 선택 입력 칸을 DB에 NULL로 남길 때 씁니다. */
    public static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
