package kr.matdagong.common.tag;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** 분류 이름 변환과 분류별 한도(태그 개편 명세: 큰 분류 10개, 나머지 5개)를 확인합니다. */
class TasteTagGroupTest {
    @Test
    void 분류_이름은_그대로_바꾸고_모르는_값은_null이다() {
        assertThat(TasteTagGroup.fromName("DESSERT")).isEqualTo(TasteTagGroup.DESSERT);
        assertThat(TasteTagGroup.fromName("dessert")).isNull();
        assertThat(TasteTagGroup.fromName("MENU")).isNull();
        assertThat(TasteTagGroup.fromName(null)).isNull();
    }

    @Test
    void 겹쳐도_되는_큰_분류만_10개까지_고른다() {
        assertThat(TasteTagGroup.CUISINE.maxSelections()).isEqualTo(10);
        assertThat(TasteTagGroup.DESSERT.maxSelections()).isEqualTo(10);
        assertThat(TasteTagGroup.MOOD.maxSelections()).isEqualTo(10);
        assertThat(TasteTagGroup.TASTE.maxSelections()).isEqualTo(5);
        assertThat(TasteTagGroup.VISIT.maxSelections()).isEqualTo(5);
        assertThat(TasteTagGroup.TRAVEL.label()).isEqualTo("여행·드라이브");
    }
}
