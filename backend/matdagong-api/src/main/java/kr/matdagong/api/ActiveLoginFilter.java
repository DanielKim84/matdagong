package kr.matdagong.api;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import kr.matdagong.common.http.RestClients;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 맛다공 API 요청을 처리하기 전에, 그 access token이 아직 로그인 중인지 공통 인증 서버에 묻습니다.
 * 토큰 검증(SecurityConfig)은 서명만 보므로, 다른 기기 로그인·로그아웃·탈퇴·계정 차단으로 끝난 토큰은 여기서 401로 막습니다.
 * 화면은 401을 받으면 로그인을 다시 시작하고, 로그인 화면이 "다른 기기에서 로그인되어 로그아웃됐어요"를 보여 줍니다.
 *
 * <p>화면 하나가 요청을 동시에 여러 개 보내므로, 답은 토큰별로 잠깐(기본 30초) 기억해 같은 질문을 줄입니다.
 * 그래서 다른 기기에서 로그인한 뒤 그만큼은 이전 기기 요청이 통과할 수 있습니다. 인증 서버에 닿지 못하면 서비스 이용이
 * 멈추지 않도록 통과시키고(서명은 SecurityConfig가 다시 확인함) 기억하지 않습니다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class ActiveLoginFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(ActiveLoginFilter.class);
    private static final String BEARER = "Bearer ";
    /** 기억해 둔 답이 이만큼 쌓이면 만료된 것을 정리합니다. */
    private static final int CLEANUP_SIZE = 10_000;
    /** 인증 서버가 늦으면 요청 전체가 붙잡히지 않도록 짧게 기다립니다. */
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(2);

    private static final Duration READ_TIMEOUT = Duration.ofSeconds(3);

    private final RestClient authServer;
    private final Duration cacheTtl;
    private final Map<String, CachedCheck> checks = new ConcurrentHashMap<>();

    @Autowired
    public ActiveLoginFilter(
            @Value("${dagong.auth.issuer}") String authUrl,
            @Value("${dagong.auth.session-check-cache}") Duration cacheTtl) {
        this(RestClients.create(authUrl, CONNECT_TIMEOUT, READ_TIMEOUT), cacheTtl);
    }

    ActiveLoginFilter(RestClient authServer, Duration cacheTtl) {
        this.authServer = authServer;
        this.cacheTtl = cacheTtl;
    }

    /** 토큰 없이 여는 사진 주소 등은 SecurityConfig의 규칙만 따릅니다. */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        return !request.getRequestURI().startsWith("/api/v1/")
                || authorization == null
                || !authorization.startsWith(BEARER);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (isActive(request.getHeader(HttpHeaders.AUTHORIZATION))) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
    }

    private boolean isActive(String authorization) {
        long now = System.currentTimeMillis();
        String key = tokenKey(authorization);
        CachedCheck cached = checks.get(key);
        if (cached != null && cached.expiresAt() > now) return cached.active();
        if (checks.size() > CLEANUP_SIZE) checks.values().removeIf(check -> check.expiresAt() <= now);

        boolean active;
        try {
            authServer
                    .get()
                    .uri("/api/v1/matdagong/session")
                    .header(HttpHeaders.AUTHORIZATION, authorization)
                    .retrieve()
                    .toBodilessEntity();
            active = true;
        } catch (HttpClientErrorException.Unauthorized exception) {
            active = false;
        } catch (RestClientException exception) {
            log.warn("로그인 확인을 하지 못해 요청을 그대로 처리합니다: {}", exception.getMessage());
            return true;
        }
        checks.put(key, new CachedCheck(active, now + cacheTtl.toMillis()));
        return active;
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

    private record CachedCheck(boolean active, long expiresAt) {}
}
