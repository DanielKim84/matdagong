package kr.matdagong.community.taster;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** 장소 서비스에서 신뢰 재료를 받아 오는 호출과 실패 시 빈 값 처리를 확인합니다. */
class PlaceTrustClientTest {
    private static final UUID TASTER = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final String URL = "http://place-service/api/v1/places/trust-stats";

    private MockRestServiceServer server;
    private PlaceTrustClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://place-service");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new PlaceTrustClient(builder.build());
    }

    @Test
    void 사용자_토큰으로_경험_재료를_받아_계정별로_돌려준다() {
        server.expect(requestTo(URL))
                .andExpect(header("Authorization", "Bearer user-token"))
                .andRespond(withSuccess(
                        """
                        [{"accountId": "%s", "agreedCount": 3, "conflictCount": 1, "tagMatchPercent": null}]
                        """
                                .formatted(TASTER),
                        MediaType.APPLICATION_JSON));

        PlaceTrustClient.TrustStats stats = client.statsFor("user-token").get(TASTER);

        assertThat(stats.agreedCount()).isEqualTo(3);
        assertThat(stats.conflictCount()).isEqualTo(1);
        assertThat(stats.tagMatchPercent()).isNull();
    }

    @Test
    void 장소_서비스가_실패하면_신뢰_없이_목록을_보여_주도록_빈_값을_돌려준다() {
        server.expect(requestTo(URL)).andRespond(withServerError());

        assertThat(client.statsFor("user-token")).isEmpty();
    }
}
