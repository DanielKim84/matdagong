package kr.matdagong.community.point;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** 포인트 잔액·원장 조회 API의 응답 자료형입니다. */
public final class PointModels {
    private PointModels() {}

    /** 원장 항목 종류입니다. DB의 event_type 값과 같습니다. */
    public enum PointEventType {
        EARN,
        SPEND,
        ADJUST
    }

    public record PointAccount(long balance, List<PointEntry> history) {}

    public record PointEntry(
            UUID historyId, PointEventType eventType, String title, String memo, int amount, Instant createdAt) {}
}
