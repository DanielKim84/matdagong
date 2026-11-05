package kr.matdagong.common.media;

import java.nio.charset.StandardCharsets;

/** 서비스가 저장하는 사진 형식(JPG·PNG·WEBP)과 실제 파일 머리 바이트 검사를 한곳에서 정합니다. */
public final class ImageFiles {
    private ImageFiles() {}

    /** 확장자·Content-Type·data URL 머리말만 믿지 않고, 바이트가 그 형식의 이미지로 시작하는지 확인합니다. */
    public static boolean matchesSignature(String mimeType, byte[] data) {
        if (mimeType == null || data == null) return false;
        return switch (mimeType) {
            case "image/jpeg" -> data.length >= 3
                    && (data[0] & 0xff) == 0xff
                    && (data[1] & 0xff) == 0xd8
                    && (data[2] & 0xff) == 0xff;
            case "image/png" -> data.length >= 8
                    && data[0] == (byte) 0x89
                    && data[1] == 0x50
                    && data[2] == 0x4e
                    && data[3] == 0x47
                    && data[4] == 0x0d
                    && data[5] == 0x0a
                    && data[6] == 0x1a
                    && data[7] == 0x0a;
            case "image/webp" -> data.length >= 12
                    && new String(data, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                    && new String(data, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
            default -> false;
        };
    }
}
