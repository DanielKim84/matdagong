package kr.matdagong.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.Filter;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.MapPropertySource;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

/** 실제 보안 설정으로 사진 주소는 토큰 없이 열리고, API는 토큰이 있어야 하며, 허용 목록 밖 주소는 막히는지 확인합니다. */
class SecurityConfigTest {
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        // 공개 키는 첫 토큰 검증 때 가져오므로 이 테스트에서는 인증 서버에 연결하지 않습니다.
        context.getEnvironment()
                .getPropertySources()
                .addFirst(new MapPropertySource(
                        "test",
                        Map.of("dagong.auth.issuer", "http://localhost:1", "dagong.auth.client-id", "matdagong-web")));
        context.register(TestConfig.class);
        context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class))
                .build();
    }

    @AfterEach
    void tearDown() {
        context.close();
    }

    @Test
    void 사진_주소는_토큰_없이_열리고_API는_토큰을_요구한다() throws Exception {
        mvc.perform(get("/media/place-record-photos/11111111-1111-1111-1111-111111111111"))
                .andExpect(status().isOk());
        mvc.perform(get("/media/place-menu-photos/11111111-1111-1111-1111-111111111111"))
                .andExpect(status().isOk());
        mvc.perform(get("/media/profiles/11111111-1111-1111-1111-111111111111/avatar"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/places")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/places").header("Authorization", "Bearer bad-token"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/places").header("Authorization", "Bearer good-token"))
                .andExpect(status().isOk());
    }

    @Test
    void 허용_목록에_없는_주소는_토큰이_있어도_막는다() throws Exception {
        mvc.perform(get("/other").header("Authorization", "Bearer good-token")).andExpect(status().isForbidden());
    }

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @Import(SecurityConfig.class)
    static class TestConfig {
        /** 실제 서명 검증 대신 "good-token"만 받는 디코더입니다(맛다공 client 확인은 MatdagongJwtDecodersTest). */
        @Bean
        @Primary
        JwtDecoder testJwtDecoder() {
            return token -> {
                if (!"good-token".equals(token)) throw new BadJwtException("invalid");
                return Jwt.withTokenValue(token)
                        .header("alg", "RS256")
                        .subject("11111111-1111-1111-1111-111111111111")
                        .build();
            };
        }

        @Bean
        SampleController sampleController() {
            return new SampleController();
        }
    }

    @RestController
    static class SampleController {
        @GetMapping({
            "/media/place-record-photos/{photoId}",
            "/media/place-menu-photos/{menuId}",
            "/media/profiles/{accountId}/avatar",
            "/api/v1/places",
            "/other"
        })
        String ok() {
            return "ok";
        }
    }
}
