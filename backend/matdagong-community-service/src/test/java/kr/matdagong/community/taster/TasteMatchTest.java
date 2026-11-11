package kr.matdagong.community.taster;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.Set;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.community.profile.ProfileModels.FoodFocus;
import kr.matdagong.community.taster.TasteMatch.MyTaste;
import org.junit.jupiter.api.Test;

/** 맛객 분야의 분류만 세고 분류마다 같은 무게로 평균 내는 취향 % 계산을 확인합니다. */
class TasteMatchTest {
    private static final Map<TasteTagGroup, Set<String>> RESTAURANT_AND_CAFE_LIKES = Map.of(
            TasteTagGroup.CUISINE, Set.of("한식", "일식"),
            TasteTagGroup.TASTE, Set.of("매콤·얼큰"),
            TasteTagGroup.CAFE, Set.of("커피 맛집"));

    @Test
    void 분류마다_겹친_비율을_같은_무게로_평균_낸다() {
        MyTaste me = new MyTaste(FoodFocus.BOTH, RESTAURANT_AND_CAFE_LIKES);

        // 음식 종류 1/2, 맛·메뉴 1/1, 카페 종류 0/1 → (0.5 + 1 + 0) / 3
        assertThat(TasteMatch.percent(me, FoodFocus.BOTH, List.of("한식", "매콤·얼큰")))
                .isEqualTo(50);
    }

    @Test
    void 맛객_분야에서_고를_수_없는_분류는_세지_않는다() {
        MyTaste me = new MyTaste(FoodFocus.BOTH, RESTAURANT_AND_CAFE_LIKES);

        assertThat(TasteMatch.percent(me, FoodFocus.CAFE_DESSERT, List.of("커피 맛집")))
                .isEqualTo(100);
        // 식당 맛객: 음식 종류 1/2, 맛·메뉴 0/1 → 25
        assertThat(TasteMatch.percent(me, FoodFocus.RESTAURANT, List.of("한식", "커피 맛집")))
                .isEqualTo(25);
    }

    @Test
    void 내가_분야를_정했으면_분야_일치를_분류_하나처럼_넣는다() {
        MyTaste me = new MyTaste(FoodFocus.CAFE_DESSERT, Map.of(TasteTagGroup.CAFE, Set.of("커피 맛집", "로스터리")));

        // 카페 종류 1/2 + 분야 일치 1 → 75
        assertThat(TasteMatch.percent(me, FoodFocus.CAFE_DESSERT, List.of("커피 맛집")))
                .isEqualTo(75);
        // 맛객 분야가 BOTH면 분야는 맞는 것으로 봅니다.
        assertThat(TasteMatch.percent(me, FoodFocus.BOTH, List.of("커피 맛집"))).isEqualTo(75);
        // 식당 맛객은 카페 종류를 세지 않고 분야도 달라 0입니다.
        assertThat(TasteMatch.percent(me, FoodFocus.RESTAURANT, List.of("커피 맛집")))
                .isZero();
    }

    @Test
    void 셀_분류가_없으면_null이다() {
        assertThat(TasteMatch.percent(new MyTaste(FoodFocus.BOTH, Map.of()), FoodFocus.BOTH, List.of("한식")))
                .isNull();
        MyTaste cafeOnly = new MyTaste(FoodFocus.BOTH, Map.of(TasteTagGroup.DESSERT, Set.of("소금빵")));
        assertThat(TasteMatch.percent(cafeOnly, FoodFocus.RESTAURANT, List.of("한식")))
                .isNull();
    }

    @Test
    void 결과는_0에서_100_사이_정수로_반올림한다() {
        MyTaste me = new MyTaste(FoodFocus.BOTH, Map.of(TasteTagGroup.CUISINE, Set.of("한식", "일식", "중식")));

        assertThat(TasteMatch.percent(me, FoodFocus.BOTH, List.of("한식"))).isEqualTo(33);
        assertThat(TasteMatch.percent(me, FoodFocus.BOTH, List.of("한식", "일식"))).isEqualTo(67);
    }
}
