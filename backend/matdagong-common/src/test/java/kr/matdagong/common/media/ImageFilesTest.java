package kr.matdagong.common.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** 이미지 머리 바이트 검사가 형식별로 맞는 파일만 인정하는지 확인합니다. */
class ImageFilesTest {
    @Test
    void 형식별_머리_바이트가_맞을_때만_이미지로_인정한다() {
        byte[] jpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0x00};
        byte[] png = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        byte[] webp = "RIFF0000WEBPVP8 ".getBytes(StandardCharsets.US_ASCII);

        assertThat(ImageFiles.matchesSignature("image/jpeg", jpeg)).isTrue();
        assertThat(ImageFiles.matchesSignature("image/png", png)).isTrue();
        assertThat(ImageFiles.matchesSignature("image/webp", webp)).isTrue();
        assertThat(ImageFiles.matchesSignature("image/png", jpeg)).isFalse();
        assertThat(ImageFiles.matchesSignature("image/gif", png)).isFalse();
        assertThat(ImageFiles.matchesSignature(null, png)).isFalse();
        assertThat(ImageFiles.matchesSignature("image/jpeg", new byte[] {(byte) 0xff}))
                .isFalse();
    }
}
