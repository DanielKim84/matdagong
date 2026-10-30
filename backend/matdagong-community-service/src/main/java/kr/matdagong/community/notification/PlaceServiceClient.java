package kr.matdagong.community.notification;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
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
 * 맛집 등록 알림을 만들기 전에 장소 서비스에 실제 기록이 있는지 확인합니다.
 * 장소 이름과 공개 여부는 요청 본문이 아니라 장소 서비스가 저장한 값을 사용합니다.
 */
@Component
public class PlaceServiceClient {
    private final RestClient client;

    @Autowired
    public PlaceServiceClient(@Value("${dagong.place-service.url}") String baseUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory).build();
    }

    PlaceServiceClient(RestClient client) {
        this.client = client;
    }

    /** 사용자의 토큰으로 장소를 조회해 그 사용자가 남긴 기록을 찾습니다. 기록이 없으면 404로 응답합니다. */
    public RecordedPlace findOwnRecord(String accessToken, String placeId, UUID accountId) {
        PlaceResponse place = fetchPlace(accessToken, placeId);
        if (place == null || place.tasters() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "등록한 맛집 기록을 찾을 수 없습니다.");
        }
        String ownerId = accountId.toString();
        return place.tasters().stream()
                .filter(taster -> ownerId.equals(taster.tasterId()))
                .findFirst()
                .map(taster -> new RecordedPlace(place.id(), place.name(), "PUBLIC".equals(taster.visibility())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "등록한 맛집 기록을 찾을 수 없습니다."));
    }

    private PlaceResponse fetchPlace(String accessToken, String placeId) {
        try {
            return client.get()
                    .uri("/api/v1/places/{placeId}", placeId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(PlaceResponse.class);
        } catch (HttpClientErrorException.NotFound exception) {
            return null;
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "맛집 기록을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
    }

    public record RecordedPlace(String placeId, String placeName, boolean publicRecord) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PlaceResponse(String id, String name, List<Taster> tasters) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Taster(String tasterId, String visibility) {}
}
