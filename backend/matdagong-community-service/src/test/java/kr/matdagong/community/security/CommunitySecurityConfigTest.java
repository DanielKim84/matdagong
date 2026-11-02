package kr.matdagong.community.security;

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
import org.springframework.core.env.MapPropertySource;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

/** 실제 커뮤니티 보안 설정으로 사진 주소는 토큰 없이 열리고, API와 그 밖의 주소는 막히는지 확인합니다. */
class CommunitySecurityConfigTest {
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
    void 프로필_사진은_토큰_없이_열리고_API와_다른_주소는_토큰을_요구한다() throws Exception {
        mvc.perform(get("/media/profiles/11111111-1111-1111-1111-111111111111/avatar"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/users/me/profile")).andExpect(status().isUnauthorized());
        mvc.perform(get("/internal/profiles")).andExpect(status().isUnauthorized());
    }

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @Import(CommunitySecurityConfig.class)
    static class TestConfig {
        @Bean
        SampleController sampleController() {
            return new SampleController();
        }
    }

    @RestController
    static class SampleController {
        @GetMapping({"/media/profiles/{accountId}/avatar", "/api/v1/users/me/profile", "/internal/profiles"})
        String ok() {
            return "ok";
        }
    }
}
