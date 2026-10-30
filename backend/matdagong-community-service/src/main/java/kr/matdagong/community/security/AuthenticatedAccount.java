package kr.matdagong.community.security;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

/** 검증된 access token의 subject(공통 계정 UUID)를 커뮤니티 데이터의 소유자 ID로 꺼냅니다. */
public final class AuthenticatedAccount {
    private AuthenticatedAccount() {}

    /** subject가 UUID가 아니면 맛다공 계정 토큰으로 볼 수 없으므로 서버 오류 대신 401로 응답합니다. */
    public static UUID id(Jwt jwt) {
        String subject = jwt.getSubject();
        try {
            if (subject != null) return UUID.fromString(subject);
        } catch (IllegalArgumentException ignored) {
            // 아래에서 같은 401 응답으로 처리합니다.
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 계정 ID가 올바르지 않습니다.");
    }
}
