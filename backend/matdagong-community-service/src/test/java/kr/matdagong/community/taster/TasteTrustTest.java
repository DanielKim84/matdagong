package kr.matdagong.community.taster;

import static org.assertj.core.api.Assertions.assertThat;

import kr.matdagong.community.taster.PlaceTrustClient.TrustStats;
import kr.matdagong.community.taster.TasterModels.TrustLevel;
import org.junit.jupiter.api.Test;

/** 신뢰 % 비중 계산과 등급 기준을 확인합니다. */
class TasteTrustTest {
    private static TrustStats stats(int agreed, int conflict, Integer tagMatch) {
        return new TrustStats("22222222-2222-2222-2222-222222222222", agreed, conflict, tagMatch);
    }

    @Test
    void 같은_맛집_경험이_없으면_신뢰를_계산하지_않는다() {
        assertThat(TasteTrust.evaluate(null, 80)).isNull();
        assertThat(TasteTrust.evaluate(stats(0, 0, null), 80)).isNull();
    }

    @Test
    void 경험_태그_취향을_50_30_20_비중으로_합친다() {
        // 경험 80%(8 ÷ 10), 태그 50%, 취향 100% → (80×50 + 50×30 + 100×20) ÷ 100 = 75
        TasteTrust.Result result = TasteTrust.evaluate(stats(8, 2, 50), 100);

        assertThat(result.score()).isEqualTo(75);
        assertThat(result.level()).isEqualTo(TrustLevel.NORMAL);
    }

    @Test
    void 비교할_재료가_없는_항목은_빼고_남은_비중으로_계산한다() {
        // 태그 없음, 취향 없음 → 경험 100%만으로 계산
        assertThat(TasteTrust.evaluate(stats(12, 0, null), null).score()).isEqualTo(100);
        // 태그 없음 → (100×50 + 30×20) ÷ 70 = 80
        assertThat(TasteTrust.evaluate(stats(12, 0, null), 30).score()).isEqualTo(80);
    }

    @Test
    void 함께_다녀온_맛집이_10곳_미만이면_퍼센트와_상관없이_알아_가는_중이다() {
        assertThat(TasteTrust.evaluate(stats(9, 0, 100), 100).level()).isEqualTo(TrustLevel.LEARNING);
        assertThat(TasteTrust.evaluate(stats(0, 9, 0), 0).level()).isEqualTo(TrustLevel.LEARNING);
    }

    @Test
    void 신뢰_80_이상이면_믿고_가는_맛객이고_10_미만이면_입맛이_다른_편이다() {
        assertThat(TasteTrust.levelOf(79, 10)).isEqualTo(TrustLevel.NORMAL);
        assertThat(TasteTrust.levelOf(80, 10)).isEqualTo(TrustLevel.TRUSTED);
        assertThat(TasteTrust.levelOf(100, 10)).isEqualTo(TrustLevel.TRUSTED);
        assertThat(TasteTrust.levelOf(10, 10)).isEqualTo(TrustLevel.NORMAL);
        assertThat(TasteTrust.levelOf(9, 10)).isEqualTo(TrustLevel.DIFFERENT);
    }
}
