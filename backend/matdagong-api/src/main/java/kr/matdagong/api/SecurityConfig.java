package kr.matdagong.api;

import java.util.stream.Stream;
import kr.matdagong.place.media.MediaUrlSigner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/** 맛다공 API는 공통 인증 서버가 발급한 맛다공 client용 access token만 받고, 허용 목록 밖의 주소는 막습니다. */
@Configuration
public class SecurityConfig {
    /**
     * img 태그가 토큰 없이 여는 사진 주소입니다. 기록·메뉴 사진 중 비공개 기록 것은 주소의 만료 서명으로 따로 확인합니다
     * (MediaUrlSigner). 프로필·배경 사진은 공개 프로필에 쓰는 사진이라 그대로 엽니다.
     */
    static final String[] PUBLIC_PATHS = {
        "/media/" + MediaUrlSigner.RECORD_PHOTO + "/**",
        "/media/" + MediaUrlSigner.MENU_PHOTO + "/**",
        "/media/profiles/**"
    };

    /** 상태 확인과 Spring 오류 응답 주소도 인증 없이 엽니다. */
    private static final String[] ALWAYS_PUBLIC = {"/actuator/health", "/actuator/info", "/error"};

    @Bean
    JwtDecoder matdagongJwtDecoder(
            @Value("${dagong.auth.issuer}") String issuer, @Value("${dagong.auth.client-id}") String clientId) {
        return MatdagongJwtDecoders.create(issuer, clientId);
    }

    /** /api/v1/** 는 맛다공 access token이 있어야 하고, 사진·상태 확인 주소만 토큰 없이 엽니다. 그 밖의 주소는 거부합니다. */
    @Bean
    SecurityFilterChain matdagongApiSecurity(HttpSecurity http) throws Exception {
        String[] permitted =
                Stream.concat(Stream.of(PUBLIC_PATHS), Stream.of(ALWAYS_PUBLIC)).toArray(String[]::new);
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
