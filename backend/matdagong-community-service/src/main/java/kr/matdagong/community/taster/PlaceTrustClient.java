package kr.matdagong.community.taster;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import kr.matdagong.common.http.RestClients;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * 맛객 신뢰 %의 경험 재료(함께 인정한 맛집·엇갈린 맛집·태그 일치)를 장소 서비스에서 가져옵니다.
 * 신뢰는 맛객 목록의 덧붙임이므로, 장소 서비스가 응답하지 않으면 빈 값으로 두고 목록은 취향 %만으로 보여 줍니다.
 */
@Component
public class PlaceTrustClient {
    private final RestClient client;

    @Autowired
    public PlaceTrustClient(
            @Value("${dagong.place-service.url}") String baseUrl,
            @Value("${dagong.place-service.connect-timeout}") Duration connectTimeout,
            @Value("${dagong.place-service.read-timeout}") Duration readTimeout) {
        this(RestClients.create(baseUrl, connectTimeout, readTimeout));
    }

    PlaceTrustClient(RestClient client) {
        this.client = client;
    }

    /** 사용자의 토큰으로 그 사용자와 다른 계정 사이의 재료를 받아 계정 ID별로 돌려줍니다. */
    public Map<UUID, TrustStats> statsFor(String accessToken) {
        TrustStats[] stats;
        try {
            stats = client.get()
                    .uri("/api/v1/places/trust-stats")
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .body(TrustStats[].class);
        } catch (RestClientException exception) {
            return Map.of();
        }
        if (stats == null) return Map.of();
        return Arrays.stream(stats)
                .collect(Collectors.toMap(item -> UUID.fromString(item.accountId()), Function.identity()));
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TrustStats(String accountId, int agreedCount, int conflictCount, Integer tagMatchPercent) {}
}
