package kr.matdagong.community.profile;

import static kr.matdagong.community.profile.ProfileModels.ProfileImage;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import kr.matdagong.common.media.ImageFiles;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * 카카오·네이버 프로필 사진을 내려받습니다. 주소는 화면이 공통 로그인의 가입 상태(profileImageUrl)에서 받아 보내므로,
 * 우리 서버가 아무 주소나 대신 열지 않게 두 제공자의 사진 CDN(https)만 받고 다른 곳으로 넘겨주는 응답(redirect)도 따라가지 않습니다.
 * 크기·형식 기준은 직접 올리는 프로필 사진(ProfileImageService)과 같습니다.
 */
@Component
public class SocialAvatarDownloader {
    /** 카카오(k.kakaocdn.net 등)와 네이버(phinf.pstatic.net 등) 사진 서버의 도메인입니다. dagong-auth가 주는 주소와 맞춥니다. */
    private static final List<String> ALLOWED_DOMAINS = List.of("kakaocdn.net", "pstatic.net");

    private static final List<String> IMAGE_TYPES = List.of("image/jpeg", "image/png", "image/webp");
    private static final String INVALID_URL = "가져올 수 없는 사진 주소예요.";
    private static final String DOWNLOAD_FAILED = "소셜 프로필 사진을 가져오지 못했어요.";

    private final HttpClient client = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    public ProfileImage download(String imageUrl) {
        URI uri = allowedUri(imageUrl);
        if (uri == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_URL);
        try {
            HttpResponse<InputStream> response = client.send(
                    HttpRequest.newBuilder(uri)
                            .timeout(Duration.ofSeconds(5))
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream body = response.body()) {
                if (response.statusCode() != 200) throw downloadFailed();
                // 한도보다 1바이트 더 읽어 넘치면 받지 않습니다.
                byte[] data = body.readNBytes((int) ProfileImageService.MAX_IMAGE_BYTES + 1);
                if (data.length == 0 || data.length > ProfileImageService.MAX_IMAGE_BYTES) throw downloadFailed();
                String mimeType = IMAGE_TYPES.stream()
                        .filter(type -> ImageFiles.matchesSignature(type, data))
                        .findFirst()
                        .orElseThrow(SocialAvatarDownloader::downloadFailed);
                return new ProfileImage(data, mimeType);
            }
        } catch (IOException exception) {
            throw downloadFailed();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw downloadFailed();
        }
    }

    /** https이고 두 제공자 사진 도메인(또는 그 하위 도메인)일 때만 주소를 돌려줍니다. 아니면 null입니다. */
    static URI allowedUri(String imageUrl) {
        if (imageUrl == null) return null;
        try {
            URI uri = new URI(imageUrl.trim());
            String host = uri.getHost();
            if (!"https".equals(uri.getScheme()) || host == null || uri.getUserInfo() != null) return null;
            if (uri.getPort() != -1 && uri.getPort() != 443) return null;
            String lowerHost = host.toLowerCase(Locale.ROOT);
            boolean allowed = ALLOWED_DOMAINS.stream()
                    .anyMatch(domain -> lowerHost.equals(domain) || lowerHost.endsWith("." + domain));
            return allowed ? uri : null;
        } catch (URISyntaxException exception) {
            return null;
        }
    }

    private static ResponseStatusException downloadFailed() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, DOWNLOAD_FAILED);
    }
}
