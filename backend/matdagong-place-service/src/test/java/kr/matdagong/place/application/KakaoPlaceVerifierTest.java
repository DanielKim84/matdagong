package kr.matdagong.place.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.List;
import java.util.Map;
import kr.matdagong.place.api.CreatePlaceRecordRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

class KakaoPlaceVerifierTest {
    private static final String KAKAO_DOCUMENTS = """
            {"documents": [
              {"id": "999", "place_name": "다른 가게", "x": "127.0", "y": "37.0"},
              {"id": "12345", "place_name": "맛있는 국밥", "phone": "02-123-4567",
               "address_name": "서울 중구 을지로동 1", "road_address_name": "서울 중구 을지로 1",
               "x": "126.9910", "y": "37.5660", "place_url": "http://place.map.kakao.com/12345",
               "category_name": "음식점 > 한식 > 국밥"}
            ], "meta": {"total_count": 2}}
            """;

    private MockRestServiceServer server;
    private KakaoPlaceVerifier verifier;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://dapi.kakao.com");
        server = MockRestServiceServer.bindTo(builder).build();
        verifier = new KakaoPlaceVerifier(builder.build(), "rest-key");
    }

    @Test
    void 카카오에서_같은_장소를_찾으면_카카오_값으로_검증한다() {
        server.expect(requestTo(startsWith("https://dapi.kakao.com/v2/local/search/keyword.json")))
                .andExpect(header("Authorization", "KakaoAK rest-key"))
                .andExpect(queryParam("radius", "1000"))
                .andRespond(withSuccess(KAKAO_DOCUMENTS, MediaType.APPLICATION_JSON));

        KakaoPlaceVerifier.PlaceInfo place = verifier.verify(request("12345", "맛있는 국밥", "https://phishing.example"));

        assertThat(place.verified()).isTrue();
        assertThat(place.placeName()).isEqualTo("맛있는 국밥");
        assertThat(place.address()).isEqualTo("서울 중구 을지로 1");
        assertThat(place.lotAddress()).isEqualTo("서울 중구 을지로동 1");
        assertThat(place.latitude()).isEqualTo(37.5660);
        assertThat(place.longitude()).isEqualTo(126.9910);
        assertThat(place.url()).isEqualTo("http://place.map.kakao.com/12345");
        server.verify();
    }

    @Test
    void 카카오가_응답했는데_같은_장소가_없으면_등록을_거부한다() {
        server.expect(requestTo(startsWith("https://dapi.kakao.com/v2/local/search/keyword.json")))
                .andRespond(withSuccess(KAKAO_DOCUMENTS, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> verifier.verify(request("55555", "가짜 가게", null)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> assertThat(((ResponseStatusException) exception).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void 카카오_호출이_실패하면_검증되지_않은_요청_값을_쓰고_위험한_주소는_버린다() {
        server.expect(requestTo(startsWith("https://dapi.kakao.com/v2/local/search/keyword.json")))
                .andRespond(withServerError());

        KakaoPlaceVerifier.PlaceInfo place = verifier.verify(request("12345", "맛있는 국밥", "https://phishing.example"));

        assertThat(place.verified()).isFalse();
        assertThat(place.placeName()).isEqualTo("맛있는 국밥");
        assertThat(place.url()).isNull();
    }

    @Test
    void 키가_없으면_카카오를_호출하지_않는다() {
        KakaoPlaceVerifier withoutKey = new KakaoPlaceVerifier(RestClient.create(), "");

        KakaoPlaceVerifier.PlaceInfo place = withoutKey.verify(request("12345", "맛있는 국밥", "http://place.map.kakao.com/12345"));

        assertThat(place.verified()).isFalse();
        assertThat(place.url()).isEqualTo("http://place.map.kakao.com/12345");
    }

    @Test
    void 카카오_장소_페이지_주소만_허용한다() {
        assertThat(KakaoPlaceVerifier.safeUrl("https://place.map.kakao.com/12345")).isNotNull();
        assertThat(KakaoPlaceVerifier.safeUrl("http://place.map.kakao.com/12345")).isNotNull();
        assertThat(KakaoPlaceVerifier.safeUrl("https://place.map.kakao.com.evil.example/12345")).isNull();
        assertThat(KakaoPlaceVerifier.safeUrl("javascript:alert(1)")).isNull();
        assertThat(KakaoPlaceVerifier.safeUrl("https://place.map.kakao.com/12345/../../x")).isNull();
    }

    private static CreatePlaceRecordRequest request(String providerPlaceId, String placeName, String providerUrl) {
        return new CreatePlaceRecordRequest("KAKAO", providerPlaceId, placeName, "한식", "서울 중구 을지로 1",
                37.5660, 126.9910, null, providerUrl, "서울 중구 을지로 1", null,
                "국물이 진하고 맛있어요.", "PUBLIC", List.of(), List.of(), Map.of(), List.of(), List.of("data:image/png;base64,AA=="));
    }
}
