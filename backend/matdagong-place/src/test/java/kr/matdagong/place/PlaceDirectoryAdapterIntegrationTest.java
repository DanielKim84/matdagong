package kr.matdagong.place;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import kr.matdagong.common.module.PlaceDirectory.RecordedPlace;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.trust.TasteTrustService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 커뮤니티 모듈의 맛집 등록 알림이 쓰는 본인 기록 확인(ownRecord)을 실제 스키마로 확인합니다. */
class PlaceDirectoryAdapterIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID OWNER = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private PlaceDirectoryAdapter directory;
    private UUID placeId;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places");
        directory = new PlaceDirectoryAdapter(jdbc, new TasteTrustService(jdbc));
        placeId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO restaurant_places (place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?, '1001', '국밥집', '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId);
    }

    @Test
    void 본인_기록이_있으면_장소_이름과_공개_여부를_돌려준다() {
        insertRecord(OWNER, "PUBLIC");
        insertRecord(OTHER, "PRIVATE");

        assertThat(directory.ownRecord(OWNER, placeId.toString()))
                .contains(new RecordedPlace(placeId.toString(), "국밥집", true));
        assertThat(directory.ownRecord(OTHER, placeId.toString()))
                .contains(new RecordedPlace(placeId.toString(), "국밥집", false));
    }

    @Test
    void 본인_기록이_없거나_장소_ID가_틀리면_비어_있다() {
        insertRecord(OTHER, "PUBLIC");

        assertThat(directory.ownRecord(OWNER, placeId.toString())).isEmpty();
        assertThat(directory.ownRecord(OWNER, "not-a-uuid")).isEmpty();
        assertThat(directory.ownRecord(OWNER, null)).isEmpty();
    }

    private void insertRecord(UUID accountId, String visibility) {
        jdbc.update(
                """
                INSERT INTO restaurant_records (record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?, ?, '맛객', '국물이 진하고 맛있어요.', ?)
                """,
                UUID.randomUUID(),
                placeId,
                accountId,
                visibility);
    }
}
