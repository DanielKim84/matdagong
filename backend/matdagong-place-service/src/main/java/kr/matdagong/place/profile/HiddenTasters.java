package kr.matdagong.place.profile;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import kr.matdagong.common.http.RestClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * 신고가 쌓여 자동으로 가려진 맛객 ID를 커뮤니티 서비스에서 30초마다 받아 둡니다.
 * 기록 조회 중(DB 트랜잭션 안)에 서비스를 부르지 않으려고 미리 받아 두며, 받지 못하면 직전 목록을 그대로 씁니다.
 * 그래서 가린 뒤 다른 맛객 화면에서 빠지기까지 최대 30초쯤 걸립니다.
 */
@Component
public class HiddenTasters {
    private static final Logger log = LoggerFactory.getLogger(HiddenTasters.class);

    private final RestClient client;
    private volatile Set<UUID> hidden = Set.of();

    @Autowired
    public HiddenTasters(
            @Value("${dagong.community-service.url}") String baseUrl,
            @Value("${dagong.community-service.connect-timeout}") Duration connectTimeout,
            @Value("${dagong.community-service.read-timeout}") Duration readTimeout) {
        this(RestClients.create(baseUrl, connectTimeout, readTimeout));
    }

    HiddenTasters(RestClient client) {
        this.client = client;
    }

    @Scheduled(initialDelay = 0, fixedDelay = 30_000)
    public void refresh() {
        try {
            List<UUID> ids = client.get()
                    .uri("/internal/v1/hidden-tasters")
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<UUID>>() {});
            hidden = ids == null ? Set.of() : Set.copyOf(ids);
        } catch (RestClientException exception) {
            log.warn("가려진 맛객 목록을 받지 못해 직전 목록을 그대로 씁니다: {}", exception.getMessage());
        }
    }

    /** SQL `= ANY(?::uuid[])`에 넣을 가려진 맛객 ID입니다. 조회하는 사람 본인은 자기 기록을 계속 볼 수 있게 뺍니다. */
    public String[] idsExcept(UUID viewerId) {
        return hidden.stream()
                .filter(id -> !id.equals(viewerId))
                .map(UUID::toString)
                .toArray(String[]::new);
    }

    /** 누가 여는지 알 수 없는 공개 사진 주소에 씁니다. */
    public String[] ids() {
        return idsExcept(null);
    }
}
