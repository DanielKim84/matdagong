package kr.matdagong.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/** 맛다공 client용 토큰만 받는지 확인합니다. */
class MatdagongJwtDecodersTest {
    private final OAuth2TokenValidator<Jwt> validator = MatdagongJwtDecoders.audienceValidator("matdagong-web");

    @Test
    void 맛다공_client에_발급한_토큰만_통과한다() {
        assertThat(validator.validate(jwt(List.of("matdagong-web"))).hasErrors())
                .isFalse();

        OAuth2TokenValidatorResult otherClient = validator.validate(jwt(List.of("other-app")));
        assertThat(otherClient.getErrors()).singleElement().satisfies(error -> assertThat(error.getDescription())
                .isEqualTo(MatdagongJwtDecoders.WRONG_AUDIENCE));
        assertThat(validator.validate(jwt(null)).hasErrors()).isTrue();
    }

    private static Jwt jwt(List<String> audience) {
        Jwt.Builder builder = Jwt.withTokenValue("token").header("alg", "RS256").subject("subject");
        if (audience != null) builder.audience(audience);
        return builder.build();
    }
}
