package kr.matdagong.gateway;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * 맛다공 API 요청을 서비스로 넘기기 전에, 그 access token이 아직 로그인 중인지 공통 인증 서버에 묻습니다.
 * 기능 서비스는 토큰 서명만 보므로, 다른 기기 로그인·로그아웃·탈퇴·계정 차단으로 끝난 토큰은 여기서 401로 막습니다.
 * 화면은 401을 받으면 로그인을 다시 시작하고, 로그인 화면이 "다른 기기에서 로그인되어 로그아웃됐어요"를 보여 줍니다.
 *
 * <p>화면 하나가 요청을 동시에 여러 개 보내므로, 답은 토큰별로 잠깐(기본 30초) 기억해 같은 질문을 줄입니다.
 * 그래서 다른 기기에서 로그인한 뒤 그만큼은 이전 기기 요청이 통과할 수 있습니다. 인증 서버에 닿지 못하면 서비스 이용이
 * 멈추지 않도록 통과시키고(서비스가 서명은 다시 확인함) 기억하지 않습니다.
 */
@Component
public class ActiveLoginFilter implements GlobalFilter, Ordered {
    private static final Logger log = LoggerFactory.getLogger(ActiveLoginFilter.class);
    private static final String BEARER = "Bearer ";
    /** 기억해 둔 답이 이만큼 쌓이면 만료된 것을 정리합니다. */
    private static final int CLEANUP_SIZE = 10_000;

    private static final Duration CHECK_TIMEOUT = Duration.ofSeconds(3);

    private final WebClient authServer;
    private final Duration cacheTtl;
    private final Map<String, CachedCheck> checks = new ConcurrentHashMap<>();

    /** 게이트웨이에는 WebClient.Builder 빈이 자동으로 만들어지지 않아 여기서 직접 만듭니다. */
    @Autowired
    public ActiveLoginFilter(
            @Value("${dagong.auth.url}") String authUrl,
            @Value("${dagong.auth.session-check-cache}") Duration cacheTtl) {
        this(WebClient.builder(), authUrl, cacheTtl);
    }

    ActiveLoginFilter(WebClient.Builder webClients, String authUrl, Duration cacheTtl) {
        this.authServer = webClients.baseUrl(authUrl).build();
        this.cacheTtl = cacheTtl;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        // 토큰 없이 여는 사진 주소 등은 각 서비스의 규칙을 따릅니다.
        if (!path.startsWith("/api/v1/") || authorization == null || !authorization.startsWith(BEARER)) {
            return chain.filter(exchange);
        }
        return isActive(authorization).flatMap(isActive -> {
            if (isActive) return chain.filter(exchange);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        });
    }

    /** 같은 토큰을 동시에 묻는 요청은 하나의 확인 결과를 함께 기다립니다. */
    private Mono<Boolean> isActive(String authorization) {
        long now = System.currentTimeMillis();
        String key = tokenKey(authorization);
        CachedCheck cached = checks.get(key);
        if (cached != null && cached.expiresAt() > now) return cached.result();
        if (checks.size() > CLEANUP_SIZE) checks.values().removeIf(check -> check.expiresAt() <= now);

        Mono<Boolean> result = authServer
                .get()
                .uri("/api/v1/matdagong/session")
                .header(HttpHeaders.AUTHORIZATION, authorization)
                .retrieve()
                .toBodilessEntity()
                .map(response -> true)
                // 인증 서버가 늦으면 요청 전체가 붙잡히지 않도록 짧게 기다립니다.
                .timeout(CHECK_TIMEOUT)
                .onErrorResume(WebClientResponseException.Unauthorized.class, exception -> Mono.just(false))
                .onErrorResume(exception -> {
                    log.warn("로그인 확인을 하지 못해 요청을 그대로 넘깁니다: {}", exception.getMessage());
                    checks.remove(key);
                    return Mono.just(true);
                })
                .cache();
        checks.put(key, new CachedCheck(result, now + cacheTtl.toMillis()));
        return result;
    }

    /** 원래 토큰 대신 해시를 열쇠로 써 메모리에 토큰을 그대로 두지 않습니다. */
    private static String tokenKey(String authorization) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(authorization.substring(BEARER.length()).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    /** 라우팅 전에 실행되도록 가장 앞에 둡니다. */
    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private record CachedCheck(Mono<Boolean> result, long expiresAt) {}
}
