package kr.matdagong.place.application;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

/**
 * 기록 작성자의 표시 이름과 캐릭터를 커뮤니티 서비스 프로필에서 가져옵니다.
 * 요청 본문의 작성자 정보를 믿으면 다른 맛객 이름으로 기록을 남길 수 있으므로, 사용자의 토큰으로 본인 프로필만 조회합니다.
 */
@Component
public class CommunityProfileClient {
    private final RestClient client;

    public CommunityProfileClient(@Value("${dagong.community-service.url}") String baseUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory).build();
    }

    public AuthorProfile findMyProfile(String accessToken) {
        try {
            AuthorProfile profile = client.get()
                    .uri("/api/v1/users/me/profile")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(AuthorProfile.class);
            if (profile == null || profile.nickname() == null || profile.nickname().isBlank()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "맛객 프로필을 먼저 만들어 주세요.");
            }
            return profile;
        } catch (HttpClientErrorException.NotFound exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "맛객 프로필을 먼저 만들어 주세요.");
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "프로필 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AuthorProfile(String nickname, int avatarVariant) {}
}
