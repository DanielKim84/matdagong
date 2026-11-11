package kr.matdagong.place.profile;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import kr.matdagong.common.http.RestClients;
import kr.matdagong.common.web.ApiErrors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

/**
 * 기록 작성자의 표시 이름(닉네임)과 신고로 가려졌는지를 커뮤니티 서비스 프로필에서 가져옵니다.
 * 요청 본문의 작성자 정보를 믿으면 다른 맛객 이름으로 기록을 남길 수 있으므로, 사용자의 토큰으로 본인 프로필만 조회합니다.
 */
@Component
public class CommunityProfileClient {
    static final String HIDDEN_BY_REPORTS = "신고가 쌓여 지금은 기록을 남기거나 고칠 수 없어요. 운영팀이 확인한 뒤 다시 알려 드릴게요.";

    private final RestClient client;

    @Autowired
    public CommunityProfileClient(
            @Value("${dagong.community-service.url}") String baseUrl,
            @Value("${dagong.community-service.connect-timeout:PT2S}") Duration connectTimeout,
            @Value("${dagong.community-service.read-timeout:PT5S}") Duration readTimeout) {
        this(RestClients.create(baseUrl, connectTimeout, readTimeout));
    }

    CommunityProfileClient(RestClient client) {
        this.client = client;
    }

    /**
     * 커뮤니티 서비스가 프로필 없음(404)으로 답하면, 기록을 남기기 전에 프로필을 만들라는 409로 바꿉니다.
     * 신고가 쌓여 가려진 맛객이면 403으로 막습니다.
     */
    public AuthorProfile findMyProfile(String accessToken) {
        AuthorProfile profile;
        try {
            profile = client.get()
                    .uri("/api/v1/users/me/profile")
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .body(AuthorProfile.class);
        } catch (HttpClientErrorException.NotFound exception) {
            throw ApiErrors.profileRequired();
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "프로필 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
        if (profile == null || profile.nickname() == null || profile.nickname().isBlank()) {
            throw ApiErrors.profileRequired();
        }
        if (Boolean.TRUE.equals(profile.hiddenByReports()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, HIDDEN_BY_REPORTS);
        return profile;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AuthorProfile(String nickname, Boolean hiddenByReports) {}
}
