package kr.matdagong.community.security;

import kr.matdagong.common.security.MatdagongJwtDecoders;
import kr.matdagong.common.security.ResourceServerSecurity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/** 커뮤니티 API는 공통 인증 서버가 발급한 맛다공 access token만 받고, 허용 목록 밖의 주소는 막습니다. */
@Configuration
public class CommunitySecurityConfig {
    /** img 태그가 토큰 없이 여는 프로필·배경 사진 주소입니다. */
    static final String[] PUBLIC_PATHS = {"/media/profiles/**"};

    @Bean
    JwtDecoder communityJwtDecoder(
            @Value("${dagong.auth.issuer}") String issuer, @Value("${dagong.auth.client-id}") String clientId) {
        return MatdagongJwtDecoders.create(issuer, clientId);
    }

    @Bean
    SecurityFilterChain communitySecurity(HttpSecurity http) throws Exception {
        return ResourceServerSecurity.build(http, PUBLIC_PATHS);
    }
}
