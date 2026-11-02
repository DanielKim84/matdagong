package kr.matdagong.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

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

    @Test
    void subject가_UUID가_아니면_한국어_문구로_401을_던진다() {
        Jwt notAccount = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject("admin")
                .build();

        assertThatThrownBy(() -> AuthenticatedAccount.id(notAccount))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(exception.getReason()).isEqualTo(AuthenticatedAccount.INVALID_ACCOUNT);
                });
    }

    private static Jwt jwt(List<String> audience) {
        Jwt.Builder builder = Jwt.withTokenValue("token").header("alg", "RS256").subject("subject");
        if (audience != null) builder.audience(audience);
        return builder.build();
    }
}
