package kr.matdagong.community.notification;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.http.RestClients;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
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
    private static final String RECORD_NOT_FOUND = "등록한 맛집 기록을 찾을 수 없습니다.";

    private final RestClient client;

    @Autowired
    public PlaceServiceClient(
            @Value("${dagong.place-service.url}") String baseUrl,
            @Value("${dagong.place-service.connect-timeout:PT2S}") Duration connectTimeout,
            @Value("${dagong.place-service.read-timeout:PT5S}") Duration readTimeout) {
        this(RestClients.create(baseUrl, connectTimeout, readTimeout));
    }

    PlaceServiceClient(RestClient client) {
        this.client = client;
    }

    /** 사용자의 토큰으로 장소를 조회해 그 사용자가 남긴 기록을 찾습니다. 기록이 없으면 404로 응답합니다. */
    public RecordedPlace findOwnRecord(String accessToken, String placeId, UUID accountId) {
        PlaceResponse place = fetchPlace(accessToken, placeId);
        if (place == null || place.tasters() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, RECORD_NOT_FOUND);
        }
        String ownerId = accountId.toString();
        return place.tasters().stream()
                .filter(taster -> ownerId.equals(taster.tasterId()))
                .findFirst()
                .map(taster -> new RecordedPlace(place.id(), place.name(), "PUBLIC".equals(taster.visibility())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, RECORD_NOT_FOUND));
    }

    private PlaceResponse fetchPlace(String accessToken, String placeId) {
        try {
            return client.get()
                    .uri("/api/v1/places/{placeId}", placeId)
                    .headers(headers -> headers.setBearerAuth(accessToken))
                    .retrieve()
                    .body(PlaceResponse.class);
        } catch (HttpClientErrorException.NotFound exception) {
            return null;
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "맛집 기록을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
    }

    /** 장소 서비스에서 확인한 본인 기록입니다. publicRecord가 true일 때만 구독자에게 알립니다. */
    public record RecordedPlace(String placeId, String placeName, boolean publicRecord) {}

    /** 장소 서비스 응답 중 이 확인에 필요한 값만 읽습니다. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PlaceResponse(String id, String name, List<Taster> tasters) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Taster(String tasterId, String visibility) {}
}
