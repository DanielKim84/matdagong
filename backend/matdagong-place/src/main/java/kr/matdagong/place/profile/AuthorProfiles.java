package kr.matdagong.place.profile;

import java.util.UUID;
import kr.matdagong.common.module.TasterDirectory;
import kr.matdagong.common.module.TasterDirectory.AuthorProfile;
import kr.matdagong.common.web.ApiErrors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * 기록 작성자의 표시 이름(닉네임)과 신고로 가려졌는지를 커뮤니티 모듈 프로필에서 가져옵니다(TasterDirectory).
 * 요청 본문의 작성자 정보를 믿으면 다른 맛객 이름으로 기록을 남길 수 있으므로, 로그인한 계정 본인 프로필만 봅니다.
 */
@Component
public class AuthorProfiles {
    static final String HIDDEN_BY_REPORTS = "신고가 쌓여 지금은 기록을 남기거나 고칠 수 없어요. 운영팀이 확인한 뒤 다시 알려 드릴게요.";

    private final TasterDirectory tasters;

    public AuthorProfiles(TasterDirectory tasters) {
        this.tasters = tasters;
    }

    /** 프로필이 없거나 닉네임이 비면 기록을 남기기 전에 프로필을 만들라는 409로, 신고가 쌓여 가려진 맛객이면 403으로 막습니다. */
    public AuthorProfile findMine(UUID accountId) {
        AuthorProfile profile = tasters.authorProfile(accountId).orElseThrow(ApiErrors::profileRequired);
        if (profile.nickname() == null || profile.nickname().isBlank()) throw ApiErrors.profileRequired();
        if (profile.hiddenByReports()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, HIDDEN_BY_REPORTS);
        return profile;
    }
}
