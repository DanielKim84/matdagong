package kr.matdagong.community.notification;

import static kr.matdagong.community.notification.NotificationModels.*;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.community.subscription.SubscriptionModels.SubscribeRequest;
import kr.matdagong.community.subscription.SubscriptionModels.SubscriptionType;
import kr.matdagong.community.subscription.SubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 맛집 등록 알림의 중복 방지, 구독자 알림, 읽음 처리 범위를 실제 스키마로 확인합니다. */
class NotificationServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID TASTER = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID SUBSCRIBER = UUID.fromString("10000000-0000-0000-0000-000000000001");

    private NotificationService service;

    @BeforeEach
    void setUp() {
        truncate("user_profiles, user_subscriptions, user_notifications");
        jdbc.update("INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '골목맛객', 1)", TASTER);
        jdbc.update(
                "INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '구독자', 1)", SUBSCRIBER);
        service = new NotificationService(jdbc);
        new SubscriptionService(jdbc, service)
                .subscribe(SUBSCRIBER, new SubscribeRequest(TASTER, SubscriptionType.FREE, null, false));
    }

    @Test
    void 공개_기록은_같은_장소로_여러_번_알려도_본인과_구독자에게_한_번씩만_알린다() {
        PlaceServiceClient.RecordedPlace place = new PlaceServiceClient.RecordedPlace("p-001", " 연남옥 ", true);

        NotificationView first = service.placeRegistered(TASTER, place);
        NotificationView again = service.placeRegistered(TASTER, place);

        assertThat(again.notificationId()).isEqualTo(first.notificationId());
        assertThat(first.notificationType()).isEqualTo(NotificationType.PLACE_RECORD_CREATED);
        assertThat(first.message()).isEqualTo("연남옥의 맛있는 이야기를 확인해 보세요.");
        assertThat(service.list(SUBSCRIBER).items()).singleElement().satisfies(item -> {
            assertThat(item.notificationType()).isEqualTo(NotificationType.TASTER_NEW_PLACE);
            assertThat(item.message()).isEqualTo("골목맛객 맛객이 연남옥을(를) 등록했어요.");
            assertThat(item.targetId()).isEqualTo("p-001");
        });
    }

    @Test
    void 비공개_기록은_구독자에게_알리지_않는다() {
        service.placeRegistered(TASTER, new PlaceServiceClient.RecordedPlace("p-002", "소금집델리", false));

        assertThat(service.list(SUBSCRIBER).items()).isEmpty();
    }

    @Test
    void 안내성_알림만_한꺼번에_읽음_처리하고_이동형_알림은_남긴다() {
        jdbc.update(
                """
                INSERT INTO user_notifications (recipient_account_id, notification_type, title, message)
                VALUES (?, 'SYSTEM_NOTICE', '공지', '점검 안내입니다.')
                """,
                TASTER);
        assertThat(service.list(TASTER).unreadCount()).isEqualTo(2);

        service.markPassiveRead(TASTER);

        NotificationFeed feed = service.list(TASTER);
        assertThat(feed.unreadCount()).isEqualTo(1);
        assertThat(feed.items())
                .filteredOn(item -> item.readAt() == null)
                .singleElement()
                .satisfies(item -> assertThat(item.notificationType()).isEqualTo(NotificationType.NEW_SUBSCRIBER));
    }
}
