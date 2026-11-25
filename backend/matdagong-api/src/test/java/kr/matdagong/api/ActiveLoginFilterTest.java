package kr.matdagong.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.ExpectedCount.times;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServiceUnavailable;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/** 끝난 로그인 토큰을 막고, 로그인 중이라는 답은 잠깐 기억해 인증 서버에 덜 묻는지 확인합니다. */
class ActiveLoginFilterTest {
    private static final String SESSION_URL = "http://auth/api/v1/matdagong/session";

    private final AtomicInteger forwarded = new AtomicInteger();
    private MockRestServiceServer authServer;
    private ActiveLoginFilter filter;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://auth");
        authServer = MockRestServiceServer.bindTo(builder).build();
        filter = new ActiveLoginFilter(builder.build(), Duration.ofSeconds(30));
    }

    @Test
    void 로그인_중인_토큰은_넘기고_같은_토큰은_기억해_다시_묻지_않는다() throws Exception {
        authServer
                .expect(once(), requestTo(SESSION_URL))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer token-a"))
                .andRespond(withStatus(HttpStatus.NO_CONTENT));

        run(apiRequest("token-a"));
        run(apiRequest("token-a"));

        assertThat(forwarded).hasValue(2);
        authServer.verify();
    }

    @Test
    void 끝난_토큰은_처리하지_않고_401로_막는다() throws Exception {
        authServer.expect(requestTo(SESSION_URL)).andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        MockHttpServletResponse response = run(apiRequest("token-b"));

        assertThat(forwarded).hasValue(0);
        assertThat(response.getStatus()).isEqualTo(401);
    }

    @Test
    void 토큰_없는_사진_주소는_묻지_않고_넘긴다() throws Exception {
        run(new MockHttpServletRequest("GET", "/media/profiles/a/avatar"));

        assertThat(forwarded).hasValue(1);
        authServer.verify();
    }

    @Test
    void 인증_서버에_닿지_못하면_막지_않고_기억하지도_않는다() throws Exception {
        authServer.expect(times(2), requestTo(SESSION_URL)).andRespond(withServiceUnavailable());

        run(apiRequest("token-c"));
        run(apiRequest("token-c"));

        assertThat(forwarded).hasValue(2);
        authServer.verify();
    }

    private static MockHttpServletRequest apiRequest(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/tasters");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        return request;
    }

    private MockHttpServletResponse run(MockHttpServletRequest request) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> forwarded.incrementAndGet());
        return response;
    }
}
