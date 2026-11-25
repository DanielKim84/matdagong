package kr.matdagong.common.module;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * 장소 모듈이 커뮤니티 모듈에 묻는 맛객 정보입니다. 커뮤니티 모듈이 구현하고(TasterDirectoryAdapter), 장소 모듈은 이
 * 인터페이스만 알아 두 모듈이 서로의 코드를 직접 부르지 않습니다. 한 서버(matdagong-api) 안에서 함수 호출로 이어집니다.
 */
public interface TasterDirectory {
    /** 기록 작성자로 쓸 본인 프로필입니다. 프로필이 없으면 비어 있습니다. */
    Optional<AuthorProfile> authorProfile(UUID accountId);

    /** 신고가 쌓여 자동으로 가려진 맛객 계정입니다. 장소 모듈은 이 맛객의 기록·사진을 다른 사람에게 보여 주지 않습니다. */
    Set<UUID> hiddenTasters();

    /** 기록에 남길 작성자 닉네임과 신고로 가려졌는지입니다. */
    record AuthorProfile(String nickname, boolean hiddenByReports) {}
}
