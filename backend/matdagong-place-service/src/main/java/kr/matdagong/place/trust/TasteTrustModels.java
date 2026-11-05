package kr.matdagong.place.trust;

/** 맛객 사이 경험 신뢰 재료 API의 응답 자료형입니다. */
public final class TasteTrustModels {
    private TasteTrustModels() {}

    /**
     * 나와 다른 계정 한 명이 같은 맛집을 두고 남긴 경험을 셉니다. 어느 쪽에서 물어도 같은 값입니다.
     * 장소 목록은 돌려주지 않아 상대가 나만 보기로 남긴 곳이 어디인지는 드러나지 않습니다.
     *
     * @param agreedCount 둘 다 인정한 맛집 수. 인정은 내 기록(공개·나만 보기) 또는 '입맛에 맞았어요' 하트입니다.
     * @param conflictCount 한쪽은 인정하고 다른 쪽은 별로였던 곳으로 남긴 맛집 수입니다.
     * @param tagMatchPercent 둘 다 기록한 맛집에서 고른 태그·매장 정보가 겹친 정도의 평균(0~100). 비교할 기록이 없으면 null입니다.
     */
    public record TasteTrustStats(String accountId, int agreedCount, int conflictCount, Integer tagMatchPercent) {}
}
