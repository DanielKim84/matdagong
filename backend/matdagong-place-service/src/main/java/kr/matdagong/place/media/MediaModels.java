package kr.matdagong.place.media;

/** 기록·메뉴 사진 데이터 자료형입니다. */
public final class MediaModels {
    private MediaModels() {}

    /** 검증을 마친 사진 바이트와 MIME 형식입니다. */
    public record Photo(byte[] bytes, String mimeType) {}
}
