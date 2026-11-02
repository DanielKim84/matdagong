package kr.matdagong.common.security;

import java.util.List;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/** 공통 인증 서버가 맛다공 client에 발급한 access token만 받는 JwtDecoder를 만듭니다. */
public final class MatdagongJwtDecoders {
    static final String WRONG_AUDIENCE = "맛다공 앱용으로 발급된 토큰이 아닙니다.";

    private MatdagongJwtDecoders() {}

    /** RS256 서명, 발급자, audience(맛다공 client ID)를 모두 확인합니다. 공개 키는 첫 검증 때 인증 서버에서 가져옵니다. */
    public static JwtDecoder create(String issuer, String clientId) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(issuer + "/oauth2/jwks")
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer), audienceValidator(clientId)));
        return decoder;
    }

    /** 같은 인증 서버가 다른 앱(client)에 발급한 토큰으로 맛다공 API를 부르지 못하게 합니다. */
    static OAuth2TokenValidator<Jwt> audienceValidator(String clientId) {
        return jwt -> {
            List<String> audience = jwt.getAudience();
            return audience != null && audience.contains(clientId)
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", WRONG_AUDIENCE, null));
        };
    }
}
