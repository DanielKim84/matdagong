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
        truncate("user_profiles, user_subscriptions, user_notifications, user_notification_settings");
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
    void 알림_설정은_저장_전에는_기본값이고_바꾼_값을_돌려준다() {
        assertThat(service.settings(SUBSCRIBER)).isEqualTo(new NotificationSettings(true, true, false));

        service.updateSettings(SUBSCRIBER, new NotificationSettings(false, true, true));

        assertThat(service.settings(SUBSCRIBER)).isEqualTo(new NotificationSettings(false, true, true));
    }

    @Test
    void 구독_맛객_새_기록_알림을_끈_구독자에게는_알리지_않는다() {
        service.updateSettings(SUBSCRIBER, new NotificationSettings(false, true, false));

        service.placeRegistered(TASTER, new PlaceServiceClient.RecordedPlace("p-003", "연남옥", true));

        assertThat(service.list(SUBSCRIBER).items()).isEmpty();
        assertThat(service.list(TASTER).items())
                .extracting(NotificationView::notificationType)
                .contains(NotificationType.PLACE_RECORD_CREATED);
    }

    @Test
    void 새_구독자_알림을_끄면_구독_알림을_만들지_않는다() {
        service.updateSettings(TASTER, new NotificationSettings(true, false, false));

        service.newSubscriber(TASTER, SUBSCRIBER, "구독자", UUID.randomUUID());

        // 설정을 바꾸기 전 구독(setUp)으로 생긴 알림 하나만 남습니다.
        assertThat(service.list(TASTER).items()).singleElement().satisfies(item -> assertThat(item.notificationType())
                .isEqualTo(NotificationType.NEW_SUBSCRIBER));
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
