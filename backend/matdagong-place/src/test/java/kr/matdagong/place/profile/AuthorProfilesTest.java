package kr.matdagong.place.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import kr.matdagong.common.module.TasterDirectory;
import kr.matdagong.common.module.TasterDirectory.AuthorProfile;
import kr.matdagong.common.web.ApiErrors;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 기록 작성자 프로필을 커뮤니티 모듈에서 읽고, 프로필이 없거나 가려진 맛객이면 막는지 확인합니다. */
class AuthorProfilesTest {
    private static final UUID ME = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Test
    void 본인_프로필의_닉네임을_가져온다() {
        assertThat(profiles(new AuthorProfile("골목맛객", false)).findMine(ME).nickname())
                .isEqualTo("골목맛객");
    }

    @Test
    void 프로필이_없거나_닉네임이_비면_409로_알린다() {
        assertStatus(profiles(null), HttpStatus.CONFLICT, ApiErrors.PROFILE_REQUIRED);
        assertStatus(profiles(new AuthorProfile(" ", false)), HttpStatus.CONFLICT, ApiErrors.PROFILE_REQUIRED);
    }

    @Test
    void 신고로_가려진_맛객이면_403으로_기록을_막는다() {
        assertStatus(profiles(new AuthorProfile("골목맛객", true)), HttpStatus.FORBIDDEN, AuthorProfiles.HIDDEN_BY_REPORTS);
    }

    private static AuthorProfiles profiles(AuthorProfile profile) {
        return new AuthorProfiles(new TasterDirectory() {
            @Override
            public Optional<AuthorProfile> authorProfile(UUID accountId) {
                return Optional.ofNullable(profile);
            }

            @Override
            public Set<UUID> hiddenTasters() {
                return Set.of();
            }
        });
    }

    private static void assertStatus(AuthorProfiles profiles, HttpStatus status, String detail) {
        assertThatThrownBy(() -> profiles.findMine(ME))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(status);
                    assertThat(exception.getReason()).isEqualTo(detail);
                });
    }
}
