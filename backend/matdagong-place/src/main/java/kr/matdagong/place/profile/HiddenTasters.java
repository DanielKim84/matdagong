package kr.matdagong.place.profile;

import java.util.UUID;
import kr.matdagong.common.module.TasterDirectory;
import org.springframework.stereotype.Component;

/**
 * 신고가 쌓여 자동으로 가려진 맛객 ID를 커뮤니티 모듈에서 바로 읽습니다(TasterDirectory). 같은 서버 안의 함수 호출이라
 * 가리는 즉시 다른 맛객 화면에서 빠집니다. 장소 SQL의 {@code = ANY(?::uuid[])}에 넣을 문자열 배열로 돌려줍니다.
 */
@Component
public class HiddenTasters {
    private final TasterDirectory tasters;

    public HiddenTasters(TasterDirectory tasters) {
        this.tasters = tasters;
    }

    /** 조회하는 사람 본인은 자기 기록을 계속 볼 수 있게 뺍니다. */
    public String[] idsExcept(UUID viewerId) {
        return tasters.hiddenTasters().stream()
                .filter(id -> !id.equals(viewerId))
                .map(UUID::toString)
                .toArray(String[]::new);
    }

    /** 누가 여는지 알 수 없는 공개 사진 주소에 씁니다. */
    public String[] ids() {
        return idsExcept(null);
    }
}
