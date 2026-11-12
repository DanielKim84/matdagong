package kr.matdagong.place.catalog;

import java.util.List;
import java.util.Map;

/** 장소 서비스가 화면에 제공하는 장소 정보와 맛객별 방문 기록의 응답 자료형입니다. */
public final class PlaceModels {
    private PlaceModels() {}

    /** 기록 공개 범위입니다. DB의 restaurant_records.visibility 값과 같습니다. */
    public enum RecordVisibility {
        PUBLIC,
        PRIVATE
    }

    /**
     * 장소 하나와 그 장소의 맛객별 기록(최신순)입니다.
     *
     * @param recordCount 보이는 기록 수입니다. 내 기록함(OWN_ONLY)에서도 다른 맛객의 공개 기록까지 셉니다.
     * @param visitConditions 기록들의 매장 이용 조건을 합친 목록입니다.
     * @param providerCode 지도 제공자(KAKAO 등)입니다.
     */
    public record PlaceView(
            String id,
            String name,
            String category,
            String address,
            double latitude,
            double longitude,
            int recordCount,
            List<String> visitConditions,
            List<TasterRecordView> tasters,
            String providerCode,
            String providerPlaceId,
            String providerPhone,
            String providerUrl,
            String roadAddress,
            String lotAddress) {}

    /**
     * 맛객 한 명이 이 장소에 남긴 기록입니다. 작성자 사진·캐릭터는 담지 않고 화면이 커뮤니티 프로필에서 채웁니다.
     *
     * @param photos 기록 사진 주소입니다. 비공개 기록이면 만료 서명이 붙은 주소입니다.
     * @param recordedAt 기록을 남긴 시각(ISO-8601)입니다. 피드 최신순과 기록 일기 달력에 씁니다.
     */
    public record TasterRecordView(
            String tasterId,
            String tasterName,
            String note,
            List<MenuView> menus,
            List<String> tags,
            Map<String, String> tagGroups,
            List<String> visitConditions,
            List<String> photos,
            RecordVisibility visibility,
            String recordedAt) {}

    /** photo는 메뉴 사진 주소입니다. 비공개 기록이면 만료 서명이 붙은 주소입니다. */
    public record MenuView(String name, Integer price, String photo) {}
}
