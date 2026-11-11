package kr.matdagong.community.taster;

import kr.matdagong.community.taster.PlaceTrustClient.TrustStats;
import kr.matdagong.community.taster.TasterModels.TrustLevel;

/**
 * 나와 맛객 사이의 신뢰 %를 계산합니다. 같은 맛집 경험이 하나도 없으면 신뢰 대신 취향 %만 보여 주므로 계산하지 않습니다.
 * 신뢰 재료를 더하거나 비중을 바꿀 때는 이 클래스만 고칩니다(docs/ui/current-design.md의 경험 신뢰 항목도 함께).
 */
final class TasteTrust {
    /** 경험 일치: 함께 인정한 곳 ÷ (함께 인정한 곳 + 엇갈린 곳) */
    static final int EXPERIENCE_WEIGHT = 50;
    /** 같은 맛집 태그 일치: 둘 다 기록한 맛집에서 고른 태그·매장 정보가 겹친 정도 */
    static final int TAG_WEIGHT = 30;
    /** 취향·스타일 일치: 맛객 목록의 취향 %(추천 취향과 소개하는 맛집 분야) */
    static final int TASTE_WEIGHT = 20;
    /** 표본이 적으면 퍼센트가 쉽게 100%가 되므로, 함께 다녀온 맛집이 이만큼 쌓여야 등급을 줍니다. */
    static final int MIN_SHARED_PLACES = 10;

    private TasteTrust() {}

    /** @param tasteMatchPercent 비교할 취향이 없어 취향 %를 셀 수 없으면(TasteMatch가 null) null입니다. */
    static Result evaluate(TrustStats stats, Integer tasteMatchPercent) {
        if (stats == null) return null;
        int sharedPlaces = stats.agreedCount() + stats.conflictCount();
        if (sharedPlaces <= 0) return null;
        double weighted = EXPERIENCE_WEIGHT * (stats.agreedCount() * 100.0 / sharedPlaces);
        int weights = EXPERIENCE_WEIGHT;
        // 둘 다 기록한 맛집이 없으면(하트·별로였어요로만 겹침) 태그를 비교할 수 없으므로, 재료가 없는 항목은 빼고 나머지 비중을 늘립니다.
        if (stats.tagMatchPercent() != null) {
            weighted += TAG_WEIGHT * stats.tagMatchPercent();
            weights += TAG_WEIGHT;
        }
        if (tasteMatchPercent != null) {
            weighted += TASTE_WEIGHT * tasteMatchPercent;
            weights += TASTE_WEIGHT;
        }
        int score = (int) Math.round(weighted / weights);
        return new Result(score, levelOf(score, sharedPlaces));
    }

    static TrustLevel levelOf(int score, int sharedPlaces) {
        if (sharedPlaces < MIN_SHARED_PLACES) return TrustLevel.LEARNING;
        if (score >= 80) return TrustLevel.TRUSTED;
        // 구독을 막지 않도록 거의 맞지 않을 때만 다른 입맛으로 알립니다.
        if (score < 10) return TrustLevel.DIFFERENT;
        return TrustLevel.NORMAL;
    }

    record Result(int score, TrustLevel level) {}
}
