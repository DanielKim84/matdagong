package kr.matdagong.place.application;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 비공개 기록 사진을 base64로 응답에 넣지 않고, 작성자에게만 짧은 기간 유효한 서명 주소로 제공합니다.
 * img 태그는 Authorization 헤더를 보낼 수 없으므로 주소 자체에 만료 시각과 HMAC 서명을 담습니다.
 */
@Component
public class MediaUrlSigner {
    public static final String RECORD_PHOTO = "place-record-photos";
    public static final String MENU_PHOTO = "place-menu-photos";
    private static final String ALGORITHM = "HmacSHA256";
    /** 만료 시각을 1시간 단위로 올려, 같은 시간대의 목록 조회에서는 같은 주소가 나와 브라우저 캐시를 쓸 수 있게 합니다. */
    private static final long EXPIRY_BUCKET_SECONDS = 3600;

    private final byte[] key;
    private final Duration ttl;
    private final Clock clock;

    @Autowired
    public MediaUrlSigner(
            @Value("${dagong.place.media-signing-key:}") String configuredKey,
            @Value("${dagong.place.media-url-ttl:PT6H}") Duration ttl) {
        this(configuredKey, ttl, Clock.systemUTC());
    }

    MediaUrlSigner(String configuredKey, Duration ttl, Clock clock) {
        // 키를 설정하지 않으면 시작할 때마다 새 키를 만듭니다. 재시작 전에 받은 비공개 사진 주소는 더 이상 열리지 않습니다.
        if (configuredKey == null || configuredKey.isBlank()) {
            this.key = new byte[32];
            new SecureRandom().nextBytes(this.key);
        } else {
            this.key = configuredKey.getBytes(StandardCharsets.UTF_8);
        }
        this.ttl = ttl;
        this.clock = clock;
    }

    public String signedUrl(String kind, UUID id) {
        long expiresAt = (clock.instant().plus(ttl).getEpochSecond() / EXPIRY_BUCKET_SECONDS + 1) * EXPIRY_BUCKET_SECONDS;
        return "/media/%s/%s?exp=%d&sig=%s".formatted(kind, id, expiresAt, signature(kind, id, expiresAt));
    }

    /** 서명이 맞고 아직 만료되지 않았으면 남은 유효 시간(초)을, 아니면 -1을 반환합니다. */
    public long remainingSeconds(String kind, UUID id, Long expiresAt, String signature) {
        if (expiresAt == null || signature == null) return -1;
        long remaining = expiresAt - clock.instant().getEpochSecond();
        if (remaining <= 0) return -1;
        byte[] expected = signature(kind, id, expiresAt).getBytes(StandardCharsets.US_ASCII);
        boolean valid = MessageDigest.isEqual(expected, signature.getBytes(StandardCharsets.US_ASCII));
        return valid ? remaining : -1;
    }

    private String signature(String kind, UUID id, long expiresAt) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(key, ALGORITHM));
            byte[] digest = mac.doFinal((kind + ":" + id + ":" + expiresAt).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("미디어 주소 서명에 실패했습니다.", exception);
        }
    }
}
