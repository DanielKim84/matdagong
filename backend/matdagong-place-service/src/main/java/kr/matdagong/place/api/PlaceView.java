package kr.matdagong.place.api;

import java.util.List;
import java.util.Map;

/** 장소 서비스가 화면에 제공하는 장소 정보와 대표 방문 기록의 응답 모델입니다. */
public record PlaceView(
        String id,
        String name,
        String category,
        String address,
        double latitude,
        double longitude,
        String emoji,
        String accentColor,
        String visitedOn,
        String recentNote,
        int recordCount,
        List<String> visitConditions,
        boolean advertisement,
        List<TasterRecordView> tasters,
        String providerCode,
        String providerPlaceId,
        String providerPhone,
        String providerUrl,
        String roadAddress,
        String lotAddress
) {
    /** 지도 제공자 정보가 없는 SamplePlaceCatalog의 화면 개발용 장소에서 사용합니다. */
    public PlaceView(String id, String name, String category, String address,
                     double latitude, double longitude, String emoji, String accentColor,
                     String visitedOn, String recentNote, int recordCount,
                     List<String> visitConditions, boolean advertisement, List<TasterRecordView> tasters) {
        this(id, name, category, address, latitude, longitude, emoji, accentColor,
                visitedOn, recentNote, recordCount, visitConditions, advertisement, tasters,
                null, null, null, null, null, null);
    }

    public record TasterRecordView(
            String tasterId,
            String tasterName,
            String tag,
            String avatar,
            String avatarColor,
            String note,
            List<MenuView> menus,
            List<String> tags,
            Map<String, String> tagGroups,
            List<String> visitConditions,
            List<String> photos,
            String visibility,
            int placeCount,
            /** 기록을 남긴 시각(ISO-8601)입니다. 피드 최신순과 기록 일기 달력에 씁니다. 샘플 기록은 null입니다. */
            String recordedAt
    ) {
        /** 메뉴·사진 없이 소개만 있는 SamplePlaceCatalog의 공개 샘플 기록에서 사용합니다. */
        public TasterRecordView(String tasterId, String tasterName, String tag,
                                String avatar, String avatarColor, String note) {
            this(tasterId, tasterName, tag, avatar, avatarColor, note,
                    List.of(), List.of(), Map.of(), List.of(), List.of(), "PUBLIC", 1, null);
        }
    }

    /** photo는 메뉴 사진 주소입니다. 비공개 기록이면 만료 서명이 붙은 주소입니다. */
    public record MenuView(String name, Integer price, String photo) {}
}
