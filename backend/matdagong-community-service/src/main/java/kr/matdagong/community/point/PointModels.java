package kr.matdagong.community.point;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** 포인트 잔액·원장 조회 API의 응답 자료형입니다. */
public final class PointModels {
    private PointModels() {}

    public record PointAccount(long balance, List<PointEntry> history) {}

    /** 원장 한 줄입니다. 적립·사용은 amount 부호로 구분하므로 원장 종류(event_type)는 보내지 않습니다. */
    public record PointEntry(UUID historyId, String title, String memo, int amount, Instant createdAt) {}
}
