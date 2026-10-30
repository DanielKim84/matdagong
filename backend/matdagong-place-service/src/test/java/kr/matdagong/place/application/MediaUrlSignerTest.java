package kr.matdagong.place.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class MediaUrlSignerTest {
    private static final Pattern SIGNED = Pattern.compile("^/media/([a-z-]+)/([0-9a-f-]{36})\\?exp=(\\d+)&sig=([A-Za-z0-9_-]+)$");
    private static final Instant NOW = Instant.parse("2026-10-30T10:15:00Z");
    private final UUID photoId = UUID.randomUUID();

    private MediaUrlSigner signerAt(Instant now) {
        return new MediaUrlSigner("test-signing-key", Duration.ofHours(6), Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void 서명한_주소는_만료_전까지_검증된다() {
        Matcher url = parse(signerAt(NOW).signedUrl(MediaUrlSigner.RECORD_PHOTO, photoId));

        long remaining = signerAt(NOW).remainingSeconds(MediaUrlSigner.RECORD_PHOTO, photoId,
                Long.parseLong(url.group(3)), url.group(4));

        assertThat(url.group(1)).isEqualTo(MediaUrlSigner.RECORD_PHOTO);
        assertThat(remaining).isGreaterThan(Duration.ofHours(6).toSeconds());
    }

    @Test
    void 같은_시간대에는_같은_주소를_만들어_브라우저_캐시를_쓴다() {
        String first = signerAt(NOW).signedUrl(MediaUrlSigner.RECORD_PHOTO, photoId);
        String later = signerAt(NOW.plusSeconds(20)).signedUrl(MediaUrlSigner.RECORD_PHOTO, photoId);

        assertThat(later).isEqualTo(first);
    }

    @Test
    void 만료된_주소는_거부한다() {
        Matcher url = parse(signerAt(NOW).signedUrl(MediaUrlSigner.RECORD_PHOTO, photoId));
        long expiresAt = Long.parseLong(url.group(3));

        long remaining = signerAt(Instant.ofEpochSecond(expiresAt + 1))
                .remainingSeconds(MediaUrlSigner.RECORD_PHOTO, photoId, expiresAt, url.group(4));

        assertThat(remaining).isEqualTo(-1);
    }

    @Test
    void 다른_사진이나_종류_만료시각으로_서명을_재사용할_수_없다() {
        MediaUrlSigner signer = signerAt(NOW);
        Matcher url = parse(signer.signedUrl(MediaUrlSigner.RECORD_PHOTO, photoId));
        long expiresAt = Long.parseLong(url.group(3));
        String signature = url.group(4);

        assertThat(signer.remainingSeconds(MediaUrlSigner.RECORD_PHOTO, UUID.randomUUID(), expiresAt, signature)).isEqualTo(-1);
        assertThat(signer.remainingSeconds(MediaUrlSigner.MENU_PHOTO, photoId, expiresAt, signature)).isEqualTo(-1);
        assertThat(signer.remainingSeconds(MediaUrlSigner.RECORD_PHOTO, photoId, expiresAt + 3600, signature)).isEqualTo(-1);
        assertThat(signer.remainingSeconds(MediaUrlSigner.RECORD_PHOTO, photoId, expiresAt, null)).isEqualTo(-1);
    }

    @Test
    void 다른_키로_만든_서명은_거부한다() {
        Matcher url = parse(signerAt(NOW).signedUrl(MediaUrlSigner.RECORD_PHOTO, photoId));
        MediaUrlSigner otherKey = new MediaUrlSigner("other-key", Duration.ofHours(6), Clock.fixed(NOW, ZoneOffset.UTC));

        assertThat(otherKey.remainingSeconds(MediaUrlSigner.RECORD_PHOTO, photoId,
                Long.parseLong(url.group(3)), url.group(4))).isEqualTo(-1);
    }

    private static Matcher parse(String url) {
        Matcher matcher = SIGNED.matcher(url);
        assertThat(matcher.matches()).as(url).isTrue();
        return matcher;
    }
}
