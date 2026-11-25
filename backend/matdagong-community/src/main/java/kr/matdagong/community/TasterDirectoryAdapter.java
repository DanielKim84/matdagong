package kr.matdagong.community;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import kr.matdagong.common.module.TasterDirectory;
import kr.matdagong.community.profile.ProfileQueries;
import kr.matdagong.community.report.TasterReportService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** 장소 모듈이 묻는 맛객 정보(TasterDirectory)를 커뮤니티 모듈 서비스로 답합니다. */
@Component
class TasterDirectoryAdapter implements TasterDirectory {
    private final JdbcTemplate jdbc;
    private final TasterReportService reports;

    TasterDirectoryAdapter(@CommunityDatabase JdbcTemplate jdbc, TasterReportService reports) {
        this.jdbc = jdbc;
        this.reports = reports;
    }

    /** 기록을 저장할 때마다 불리므로 프로필 전체(사진·태그 배열)가 아니라 닉네임과 가림 여부 한 줄만 읽습니다. */
    @Override
    public Optional<AuthorProfile> authorProfile(UUID accountId) {
        return jdbc
                .query(
                        "SELECT p.nickname, %s AS hidden_by_reports FROM user_profiles p WHERE p.account_id = ?"
                                .formatted(ProfileQueries.hiddenByReports("p.account_id")),
                        (rs, row) -> new AuthorProfile(rs.getString("nickname"), rs.getBoolean("hidden_by_reports")),
                        accountId)
                .stream()
                .findFirst();
    }

    @Override
    public Set<UUID> hiddenTasters() {
        return reports.hiddenTasters();
    }
}
