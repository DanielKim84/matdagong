package kr.matdagong.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/** 게이트웨이가 끝난 로그인 토큰을 막고, 로그인 중이라는 답은 잠깐 기억해 인증 서버에 덜 묻는지 확인합니다. */
class ActiveLoginFilterTest {
    private final AtomicInteger authCalls = new AtomicInteger();
    private final AtomicInteger forwarded = new AtomicInteger();
    private final GatewayFilterChain chain = exchange -> {
        forwarded.incrementAndGet();
        return Mono.empty();
    };

    @Test
    void 로그인_중인_토큰은_넘기고_같은_토큰은_기억해_다시_묻지_않는다() {
        ActiveLoginFilter filter = filter(HttpStatus.NO_CONTENT);

        run(filter, apiRequest("token-a"));
        run(filter, apiRequest("token-a"));

        assertThat(forwarded).hasValue(2);
        assertThat(authCalls).hasValue(1);
    }

    @Test
    void 끝난_토큰은_서비스로_넘기지_않고_401로_막는다() {
        ActiveLoginFilter filter = filter(HttpStatus.UNAUTHORIZED);
        MockServerWebExchange exchange = apiRequest("token-b");

        run(filter, exchange);

        assertThat(forwarded).hasValue(0);
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void 토큰_없는_사진_주소는_묻지_않고_넘긴다() {
        ActiveLoginFilter filter = filter(HttpStatus.UNAUTHORIZED);

        run(filter, MockServerWebExchange.from(MockServerHttpRequest.get("/media/profiles/a/avatar")));

        assertThat(forwarded).hasValue(1);
        assertThat(authCalls).hasValue(0);
    }

    @Test
    void 인증_서버에_닿지_못하면_막지_않고_기억하지도_않는다() {
        ActiveLoginFilter filter = filter(HttpStatus.SERVICE_UNAVAILABLE);

        run(filter, apiRequest("token-c"));
        run(filter, apiRequest("token-c"));

        assertThat(forwarded).hasValue(2);
        assertThat(authCalls).hasValue(2);
    }

    private ActiveLoginFilter filter(HttpStatus authAnswer) {
        WebClient.Builder builder = WebClient.builder().exchangeFunction(request -> {
            authCalls.incrementAndGet();
            return Mono.just(ClientResponse.create(authAnswer).build());
        });
        return new ActiveLoginFilter(builder, "http://auth", Duration.ofSeconds(30));
    }

    private static MockServerWebExchange apiRequest(String token) {
        return MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/tasters").header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    private void run(ActiveLoginFilter filter, MockServerWebExchange exchange) {
        filter.filter(exchange, chain).block();
    }
}
