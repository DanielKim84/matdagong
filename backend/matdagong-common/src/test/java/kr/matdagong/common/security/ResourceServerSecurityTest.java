package kr.matdagong.common.security;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.Filter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

class ResourceServerSecurityTest {
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
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
    void API는_토큰이_있어야_하고_허용_목록의_주소는_토큰_없이_열린다() throws Exception {
        mvc.perform(get("/api/v1/ping")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/ping").header("Authorization", "Bearer good-token"))
                .andExpect(status().isOk());
        mvc.perform(get("/media/public/photo")).andExpect(status().isOk());
        // 상태 확인 주소는 보안에서 막지 않습니다. 이 테스트에는 actuator가 없어 404가 됩니다.
        mvc.perform(get("/actuator/health")).andExpect(status().isNotFound());
    }

    @Test
    void 허용_목록에_없는_주소는_토큰이_있어도_막는다() throws Exception {
        mvc.perform(get("/internal").header("Authorization", "Bearer good-token"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/ping").header("Authorization", "Bearer bad-token"))
                .andExpect(status().isUnauthorized());
    }

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    static class TestConfig {
        @Bean
        SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
            return ResourceServerSecurity.build(http, "/media/public/**");
        }

        @Bean
        JwtDecoder jwtDecoder() {
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
        @GetMapping({"/api/v1/ping", "/media/public/photo", "/internal"})
        String ok() {
            return "ok";
        }
    }
}
