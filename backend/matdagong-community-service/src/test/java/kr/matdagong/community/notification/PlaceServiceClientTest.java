package kr.matdagong.community.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

class PlaceServiceClientTest {
    private static final UUID OWNER = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final String PLACE_ID = "22222222-2222-2222-2222-222222222222";

    private MockRestServiceServer server;
    private PlaceServiceClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://place-service");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new PlaceServiceClient(builder.build());
    }

    @Test
    void 본인_기록이_있으면_저장된_장소_이름과_공개_여부를_사용한다() {
        server.expect(requestTo("http://place-service/api/v1/places/" + PLACE_ID))
                .andExpect(header("Authorization", "Bearer user-token"))
                .andRespond(withSuccess(place("""
                        {"tasterId": "33333333-3333-3333-3333-333333333333", "visibility": "PUBLIC"},
                        {"tasterId": "%s", "visibility": "PUBLIC"}
                        """.formatted(OWNER)), MediaType.APPLICATION_JSON));

        PlaceServiceClient.RecordedPlace recorded = client.findOwnRecord("user-token", PLACE_ID, OWNER);

        assertThat(recorded.placeName()).isEqualTo("저장된 가게");
        assertThat(recorded.publicRecord()).isTrue();
    }

    @Test
    void 비공개_기록이면_구독자_알림_대상이_아니다() {
        server.expect(requestTo("http://place-service/api/v1/places/" + PLACE_ID))
                .andRespond(withSuccess(place("""
                        {"tasterId": "%s", "visibility": "PRIVATE"}
                        """.formatted(OWNER)), MediaType.APPLICATION_JSON));

        assertThat(client.findOwnRecord("user-token", PLACE_ID, OWNER).publicRecord()).isFalse();
    }

    @Test
    void 다른_맛객의_기록만_있으면_알림을_만들지_않는다() {
        server.expect(requestTo("http://place-service/api/v1/places/" + PLACE_ID))
                .andRespond(withSuccess(place("""
                        {"tasterId": "33333333-3333-3333-3333-333333333333", "visibility": "PUBLIC"}
                        """), MediaType.APPLICATION_JSON));

        assertStatus(() -> client.findOwnRecord("user-token", PLACE_ID, OWNER), HttpStatus.NOT_FOUND);
    }

    @Test
    void 장소가_없으면_404_장소_서비스_장애면_503으로_알린다() {
        server.expect(requestTo("http://place-service/api/v1/places/" + PLACE_ID)).andRespond(withResourceNotFound());
        assertStatus(() -> client.findOwnRecord("user-token", PLACE_ID, OWNER), HttpStatus.NOT_FOUND);

        server.reset();
        server.expect(requestTo("http://place-service/api/v1/places/" + PLACE_ID)).andRespond(withServerError());
        assertStatus(() -> client.findOwnRecord("user-token", PLACE_ID, OWNER), HttpStatus.SERVICE_UNAVAILABLE);
    }

    private static String place(String tasters) {
        return """
                {"id": "%s", "name": "저장된 가게", "category": "한식", "tasters": [%s]}
                """.formatted(PLACE_ID, tasters);
    }

    private static void assertStatus(Runnable call, HttpStatus status) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> assertThat(((ResponseStatusException) exception).getStatusCode()).isEqualTo(status));
    }
}
