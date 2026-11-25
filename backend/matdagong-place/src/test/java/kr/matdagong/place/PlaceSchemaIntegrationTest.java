package kr.matdagong.place;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

/** 서비스를 거치지 않은 저장도 DB 제약이 막는지 실제 스키마로 확인합니다. */
class PlaceSchemaIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID ME = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_place_dislikes");
    }

    @Test
    void 없는_장소는_별로였던_곳으로_남길_수_없다() {
        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO user_place_dislikes (account_id, place_id) VALUES (?, ?)", ME, UUID.randomUUID()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void 기록_태그는_분류_없이_저장할_수_없다() {
        UUID placeId = UUID.randomUUID();
        UUID recordId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO restaurant_places (place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?, '1001', '국밥집', '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId);
        jdbc.update(
                """
                INSERT INTO restaurant_records (record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?, ?, '맛객', '국물이 진하고 맛있어요.', 'PUBLIC')
                """,
                recordId,
                placeId,
                ME);

        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO restaurant_record_tags (record_id, tag_name) VALUES (?, '국물이 진한')", recordId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
