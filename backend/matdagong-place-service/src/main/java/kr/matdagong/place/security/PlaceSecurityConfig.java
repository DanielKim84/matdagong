package kr.matdagong.place.security;

import kr.matdagong.common.security.MatdagongJwtDecoders;
import kr.matdagong.common.security.ResourceServerSecurity;
import kr.matdagong.place.media.MediaUrlSigner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

/** 장소 API의 읽기·쓰기 요청도 맛다공 client용 공통 계정 토큰으로 검증하고, 허용 목록 밖의 주소는 막습니다. */
@Configuration
public class PlaceSecurityConfig {
    /**
     * img 태그가 토큰 없이 여는 기록·메뉴 사진 주소입니다. 비공개 사진은 주소의 만료 서명으로 따로 확인합니다. 게이트웨이 장소
     * 경로의 /media 항목도 같은 주소로 맞춥니다.
     */
    private static final String[] PUBLIC_PATHS = {
        "/media/" + MediaUrlSigner.RECORD_PHOTO + "/**", "/media/" + MediaUrlSigner.MENU_PHOTO + "/**"
    };

    @Bean
    JwtDecoder placeJwtDecoder(
            @Value("${dagong.auth.issuer}") String issuer, @Value("${dagong.auth.client-id}") String clientId) {
        return MatdagongJwtDecoders.create(issuer, clientId);
    }

    @Bean
    SecurityFilterChain placeApiSecurity(HttpSecurity http) throws Exception {
        return ResourceServerSecurity.build(http, PUBLIC_PATHS);
    }
}
