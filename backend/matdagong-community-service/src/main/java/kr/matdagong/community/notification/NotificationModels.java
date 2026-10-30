package kr.matdagong.community.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** 사용자 알림함 API의 요청과 응답 모델입니다. */
public final class NotificationModels {
    private NotificationModels() {}

    /** 장소 이름·공개 여부·중복 방지 키는 서버가 장소 서비스 기록에서 정하므로 장소 ID만 받습니다. */
    public record PlaceRegisteredRequest(@NotBlank @Size(max = 128) String placeId) {}

    public record NotificationView(
            UUID notificationId,
            String notificationType,
            String title,
            String message,
            String targetType,
            String targetId,
            Instant createdAt,
            Instant readAt) {}

    public record NotificationFeed(List<NotificationView> items, int unreadCount) {}
}
