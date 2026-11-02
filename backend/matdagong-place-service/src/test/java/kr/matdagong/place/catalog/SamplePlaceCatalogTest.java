package kr.matdagong.place.catalog;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

/** 화면 개발용 샘플 장소가 실제 기록처럼 사진·메뉴·태그·매장 정보·기록 시각을 갖는지 확인합니다. */
class SamplePlaceCatalogTest {
    private final SamplePlaceCatalog catalog = new SamplePlaceCatalog();

    @Test
    void 샘플_기록은_메뉴_태그_매장정보_기록시각을_가진다() {
        for (PlaceView place : catalog.findAll(null)) {
            for (TasterRecordView record : place.tasters()) {
                assertThat(record.menus()).as(place.id() + " 메뉴").isNotEmpty();
                assertThat(record.tags()).as(place.id() + " 태그").isNotEmpty();
                assertThat(record.tagGroups()).as(place.id() + " 태그 묶음").containsOnlyKeys(record.tags());
                assertThat(record.visitConditions()).as(place.id() + " 매장 정보").isNotEmpty();
                assertThat(record.photos())
                        .as(place.id() + " 사진")
                        .isNotEmpty()
                        .allMatch(src -> src.startsWith("/assets/sample-food/"));
                assertThat(record.menus().getFirst().photo())
                        .as(place.id() + " 메뉴 사진")
                        .startsWith("/assets/sample-food/")
                        .isNotIn(record.photos());
                assertThat(OffsetDateTime.parse(record.recordedAt())).isNotNull();
            }
        }
    }

    @Test
    void 같은_장소의_기록은_맛객_순서대로_하루씩_앞선_시각이다() {
        PlaceView place = catalog.findById("p-003");

        assertThat(place.tasters()).hasSize(2);
        assertThat(OffsetDateTime.parse(place.tasters().get(0).recordedAt()))
                .isAfter(OffsetDateTime.parse(place.tasters().get(1).recordedAt()));
    }
}
