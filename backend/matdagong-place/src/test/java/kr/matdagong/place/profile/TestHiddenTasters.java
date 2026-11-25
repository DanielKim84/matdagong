package kr.matdagong.place.profile;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import kr.matdagong.common.module.TasterDirectory;

/** 다른 패키지의 테스트가 가려진 맛객 목록을 정해 두고 쓰는 도우미입니다. 커뮤니티 모듈 대신 정해 둔 목록을 돌려줍니다. */
public final class TestHiddenTasters {
    private TestHiddenTasters() {}

    /** 아무도 가려지지 않은 상태입니다. */
    public static HiddenTasters none() {
        return of();
    }

    public static HiddenTasters of(UUID... accountIds) {
        Set<UUID> hidden = Set.of(accountIds);
        return new HiddenTasters(new TasterDirectory() {
            @Override
            public Optional<AuthorProfile> authorProfile(UUID accountId) {
                return Optional.empty();
            }

            @Override
            public Set<UUID> hiddenTasters() {
                return hidden;
            }
        });
    }
}
