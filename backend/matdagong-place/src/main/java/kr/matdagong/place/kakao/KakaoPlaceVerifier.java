package kr.matdagong.place.kakao;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Duration;
import java.util.List;
import java.util.regex.Pattern;
import kr.matdagong.common.http.RestClients;
import kr.matdagong.common.text.Texts;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

/**
 * 여러 맛객이 함께 쓰는 가게 기본정보를 카카오 Local API로 다시 확인합니다.
 * 프런트가 카카오에서 받은 값도 서버에는 요청 본문으로 도착하므로, 같은 장소 ID를 카카오에서 직접 찾은 경우에만
 * 카카오 응답 값으로 기본정보를 갱신합니다.
 */
@Component
public class KakaoPlaceVerifier {
    private static final Logger log = LoggerFactory.getLogger(KakaoPlaceVerifier.class);
    private static final Pattern KAKAO_PLACE_URL = Pattern.compile("^https?://place\\.map\\.kakao\\.com/\\d{1,20}$");
    /** 요청 좌표 주변에서만 같은 장소 ID를 찾습니다. 카카오에서 고른 장소라면 거리는 0에 가깝습니다. */
    private static final int SEARCH_RADIUS_METERS = 1000;
    /** 카카오 키워드 검색이 한 번에 돌려주는 최대 개수입니다. 반경 안의 같은 이름 가게 중에서 장소 ID를 찾습니다. */
    private static final int SEARCH_RESULT_SIZE = 15;

    private static final String KAKAO_LOCAL_API_URL = "https://dapi.kakao.com";

    private final RestClient client;
    private final String restApiKey;

    @Autowired
    public KakaoPlaceVerifier(
            @Value("${dagong.kakao.rest-api-key}") String restApiKey,
            @Value("${dagong.kakao.connect-timeout}") Duration connectTimeout,
            @Value("${dagong.kakao.read-timeout}") Duration readTimeout) {
        this(RestClients.create(KAKAO_LOCAL_API_URL, connectTimeout, readTimeout), restApiKey);
    }

    KakaoPlaceVerifier(RestClient client, String restApiKey) {
        this.client = client;
        this.restApiKey = restApiKey == null ? "" : restApiKey.trim();
        if (this.restApiKey.isEmpty()) {
            log.warn("KAKAO_REST_API_KEY가 없어 가게 기본정보를 카카오로 검증하지 않습니다. 기존 가게 정보는 갱신되지 않습니다.");
        }
    }

    /**
     * 카카오에서 같은 장소를 찾으면 카카오 값을, 카카오 장소가 아니거나 카카오 API를 쓸 수 없으면 요청 값(submitted)을
     * 그대로 반환합니다. 카카오가 정상 응답했는데 장소가 없으면 조작되었거나 오래된 정보로 보고 등록을 거부합니다.
     *
     * @param submitted 요청 본문의 가게 정보입니다. verified는 false여야 합니다.
     */
    public PlaceInfo verify(String providerCode, String providerPlaceId, PlaceInfo submitted) {
        boolean isKakaoPlace = PlaceIdentifiers.KAKAO.equals(PlaceIdentifiers.providerCode(providerCode));
        if (!isKakaoPlace || restApiKey.isEmpty()) return submitted;
        KeywordSearchResponse response;
        try {
            response = client.get()
                    .uri(uri -> uri.path("/v2/local/search/keyword.json")
                            .queryParam("query", submitted.placeName().trim())
                            .queryParam("x", submitted.longitude())
                            .queryParam("y", submitted.latitude())
                            .queryParam("radius", SEARCH_RADIUS_METERS)
                            .queryParam("sort", "distance")
                            .queryParam("size", SEARCH_RESULT_SIZE)
                            .build())
                    .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(KeywordSearchResponse.class);
        } catch (RestClientException exception) {
            log.warn("카카오 장소 검증을 건너뜁니다: {}", exception.getMessage());
            return submitted;
        }
        List<KakaoDocument> documents =
                response == null || response.documents() == null ? List.of() : response.documents();
        return documents.stream()
                .filter(document -> providerPlaceId.equals(document.id()))
                .findFirst()
                .map(KakaoPlaceVerifier::verified)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "카카오에서 이 장소를 확인하지 못했어요. 장소를 다시 검색해 선택해 주세요."));
    }

    private static PlaceInfo verified(KakaoDocument document) {
        String road = Texts.blankToNull(document.roadAddressName());
        String lot = Texts.blankToNull(document.addressName());
        return new PlaceInfo(
                document.placeName(),
                road != null ? road : lot,
                Double.parseDouble(document.y()),
                Double.parseDouble(document.x()),
                Texts.blankToNull(document.phone()),
                safeUrl(document.placeUrl()),
                road,
                lot,
                true);
    }

    /** 상세 페이지 주소는 카카오 장소 페이지 형식만 저장하고, 그 외 주소는 버립니다. */
    public static String safeUrl(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return KAKAO_PLACE_URL.matcher(trimmed).matches() ? trimmed : null;
    }

    /** verified가 true이면 카카오에서 직접 확인한 값이라 공용 가게 정보를 갱신해도 됩니다. */
    public record PlaceInfo(
            String placeName,
            String address,
            double latitude,
            double longitude,
            String phone,
            String url,
            String roadAddress,
            String lotAddress,
            boolean verified) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KeywordSearchResponse(List<KakaoDocument> documents) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KakaoDocument(
            String id,
            @JsonProperty("place_name") String placeName,
            String phone,
            @JsonProperty("address_name") String addressName,
            @JsonProperty("road_address_name") String roadAddressName,
            String x,
            String y,
            @JsonProperty("place_url") String placeUrl) {}
}
