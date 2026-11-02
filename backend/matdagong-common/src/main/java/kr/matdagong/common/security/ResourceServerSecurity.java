package kr.matdagong.common.security;

import java.util.stream.Stream;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/** 맛다공 서비스들의 같은 주소 정책입니다. 허용 목록에 없는 주소는 모두 막습니다. */
public final class ResourceServerSecurity {
    /** 상태 확인과 Spring 오류 응답 주소는 서비스마다 인증 없이 엽니다. */
    private static final String[] ALWAYS_PUBLIC = {"/actuator/health", "/actuator/info", "/error"};

    private ResourceServerSecurity() {}

    /**
     * /api/v1/** 는 맛다공 access token이 있어야 하고, publicPaths(img 태그가 여는 사진 주소 등)와 상태 확인 주소만
     * 인증 없이 엽니다. 그 밖의 주소는 거부합니다.
     */
    public static SecurityFilterChain build(HttpSecurity http, String... publicPaths) throws Exception {
        String[] permitted =
                Stream.concat(Stream.of(publicPaths), Stream.of(ALWAYS_PUBLIC)).toArray(String[]::new);
        http.csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.requestMatchers(permitted)
                        .permitAll()
                        .requestMatchers("/api/v1/**")
                        .authenticated()
                        .anyRequest()
                        .denyAll())
                .oauth2ResourceServer(resourceServer -> resourceServer.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
