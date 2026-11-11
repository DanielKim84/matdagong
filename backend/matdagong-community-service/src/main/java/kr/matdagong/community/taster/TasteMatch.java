package kr.matdagong.community.taster;

import java.util.Collection;
import java.util.Map;
import java.util.Set;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.community.profile.ProfileModels.FoodFocus;

/**
 * 맛객 목록의 취향 %(나와의 취향 일치율)를 계산합니다.
 * 내 좋아요 태그를 분류별로 묶고, 그 맛객의 분야에서 고를 수 있는 분류만 셉니다(카페 맛객을 내 식당 태그로 깎지 않도록).
 * 분류마다 (맛객 프로필 태그와 겹친 수 ÷ 내가 그 분류에서 고른 수)를 내고 센 분류의 평균을 냅니다(분류마다 같은 무게).
 * 내가 추천 분야를 정했으면(BOTH가 아니면) 분야 일치(맛객 분야가 BOTH거나 같으면 1, 아니면 0)도 분류 하나처럼 평균에 넣습니다.
 */
final class TasteMatch {
    private TasteMatch() {}

    /**
     * 내 추천 취향입니다.
     *
     * @param likedTags 분류별 좋아요 태그 이름입니다.
     */
    record MyTaste(FoodFocus preferenceFocus, Map<TasteTagGroup, Set<String>> likedTags) {}

    /** @return 0~100 정수. 셀 분류가 하나도 없으면(비교할 취향이 없음) null입니다. */
    static Integer percent(MyTaste me, FoodFocus tasterFocus, Collection<String> tasterTags) {
        Set<TasteTagGroup> countedGroups = tasterFocus.allowedGroups();
        double ratioSum = 0;
        int counted = 0;
        for (Map.Entry<TasteTagGroup, Set<String>> entry : me.likedTags().entrySet()) {
            Set<String> liked = entry.getValue();
            if (!countedGroups.contains(entry.getKey()) || liked.isEmpty()) continue;
            long matched = liked.stream().filter(tasterTags::contains).count();
            ratioSum += (double) matched / liked.size();
            counted++;
        }
        if (me.preferenceFocus() != FoodFocus.BOTH) {
            boolean sameFocus = tasterFocus == FoodFocus.BOTH || tasterFocus == me.preferenceFocus();
            ratioSum += sameFocus ? 1 : 0;
            counted++;
        }
        if (counted == 0) return null;
        return (int) Math.round(ratioSum * 100 / counted);
    }
}
