package kr.matdagong.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

/** access token subject에서 계정 ID를 꺼내는 규칙을 확인합니다. */
class AuthenticatedAccountTest {
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
}
