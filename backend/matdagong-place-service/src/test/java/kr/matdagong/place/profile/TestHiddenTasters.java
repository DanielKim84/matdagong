package kr.matdagong.place.profile;

import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.Arrays;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** 다른 패키지의 테스트가 가려진 맛객 목록을 정해 두고 쓰는 도우미입니다. 실제 HiddenTasters에 가짜 응답을 한 번 받게 합니다. */
public final class TestHiddenTasters {
    private TestHiddenTasters() {}

    /** 아직 아무도 가려지지 않은 상태입니다(목록을 받기 전과 같음). */
    public static HiddenTasters none() {
        return new HiddenTasters(RestClient.create("http://community-service"));
    }

    public static HiddenTasters of(UUID... accountIds) {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://community-service");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        String body = Arrays.stream(accountIds).map(id -> "\"" + id + "\"").collect(Collectors.joining(",", "[", "]"));
        server.expect(requestTo("http://community-service/internal/v1/hidden-tasters"))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
        HiddenTasters hiddenTasters = new HiddenTasters(builder.build());
        hiddenTasters.refresh();
        return hiddenTasters;
    }
}
