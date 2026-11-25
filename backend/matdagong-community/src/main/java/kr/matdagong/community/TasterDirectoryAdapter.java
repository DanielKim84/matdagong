package kr.matdagong.community;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import kr.matdagong.common.module.TasterDirectory;
import kr.matdagong.community.profile.UserProfileService;
import kr.matdagong.community.report.TasterReportService;
import org.springframework.stereotype.Component;

/** 장소 모듈이 묻는 맛객 정보(TasterDirectory)를 커뮤니티 모듈 서비스로 답합니다. */
@Component
class TasterDirectoryAdapter implements TasterDirectory {
    private final UserProfileService profiles;
    private final TasterReportService reports;

    TasterDirectoryAdapter(UserProfileService profiles, TasterReportService reports) {
        this.profiles = profiles;
        this.reports = reports;
    }

    @Override
    public Optional<AuthorProfile> authorProfile(UUID accountId) {
        return profiles.findProfile(accountId)
                .map(profile -> new AuthorProfile(profile.nickname(), profile.hiddenByReports()));
    }

    @Override
    public Set<UUID> hiddenTasters() {
        return Set.copyOf(reports.hiddenTasters());
    }
}
