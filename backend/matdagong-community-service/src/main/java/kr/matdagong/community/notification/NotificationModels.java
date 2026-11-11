package kr.matdagong.community.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** 사용자 알림함 API의 요청과 응답 모델입니다. */
public final class NotificationModels {
    private NotificationModels() {}

    /** 알림 종류입니다. DB의 notification_type 값과 같습니다. SYSTEM_NOTICE는 운영 안내(지금은 신고 누적으로 가려짐)입니다. */
    public enum NotificationType {
        PLACE_RECORD_CREATED,
        TASTER_NEW_PLACE,
        NEW_SUBSCRIBER,
        SYSTEM_NOTICE
    }

    /** 장소 이름·공개 여부·중복 방지 키는 서버가 장소 서비스 기록에서 정하므로 장소 ID만 받습니다. */
    public record PlaceRegisteredRequest(@NotBlank @Size(max = 128) String placeId) {}

    /** targetType·targetId는 알림을 눌렀을 때 이동할 대상(PLACE·MY_SUBSCRIBERS)입니다. 안내성 알림은 비어 있습니다. */
    public record NotificationView(
            UUID notificationId,
            NotificationType notificationType,
            String title,
            String message,
            String targetType,
            String targetId,
            Instant createdAt,
            Instant readAt) {}

    public record NotificationFeed(List<NotificationView> items, int unreadCount) {}

    /**
     * 알림 수신 설정입니다. 구독 맛객의 새 기록(TASTER_NEW_PLACE)·새 구독자(NEW_SUBSCRIBER) 알림과 소식·이벤트 수신 동의를 켜고 끕니다.
     * 본인 맛집 등록 완료 알림은 설정과 관계없이 보냅니다.
     */
    public record NotificationSettings(
            @NotNull(message = "구독 맛객 새 기록 알림 설정을 확인해 주세요.") Boolean tasterNewPlace,
            @NotNull(message = "새 구독자 알림 설정을 확인해 주세요.") Boolean newSubscriber,
            @NotNull(message = "소식·이벤트 알림 설정을 확인해 주세요.") Boolean serviceNews) {}
}
