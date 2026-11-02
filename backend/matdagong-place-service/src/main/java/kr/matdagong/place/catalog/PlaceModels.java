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
     * 장소 하나와 그 장소의 맛객별 기록입니다.
     *
     * @param emoji 샘플 장소용 표시 값입니다. DB 장소는 빈 문자열입니다.
     * @param providerCode 지도 제공자(KAKAO 등)입니다. 샘플 장소는 null입니다.
     */
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
            String lotAddress) {
        /** 지도 제공자 정보가 없는 SamplePlaceCatalog의 화면 개발용 장소에서 사용합니다. */
        public PlaceView(
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
                List<TasterRecordView> tasters) {
            this(
                    id,
                    name,
                    category,
                    address,
                    latitude,
                    longitude,
                    emoji,
                    accentColor,
                    visitedOn,
                    recentNote,
                    recordCount,
                    visitConditions,
                    advertisement,
                    tasters,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null);
        }
    }

    /**
     * 맛객 한 명이 이 장소에 남긴 기록입니다.
     *
     * @param photos 기록 사진 주소입니다. 비공개 기록이면 만료 서명이 붙은 주소입니다.
     * @param placeCount 이 맛객이 등록한 장소 수입니다. 다른 맛객은 공개 기록만, 본인은 비공개 기록까지 셉니다.
     * @param recordedAt 기록을 남긴 시각(ISO-8601)입니다. 피드 최신순과 기록 일기 달력에 씁니다. 샘플 기록은 null입니다.
     */
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
            RecordVisibility visibility,
            int placeCount,
            String recordedAt) {
        /** 메뉴·사진 없이 소개만 있는 SamplePlaceCatalog의 공개 샘플 기록에서 사용합니다. */
        public TasterRecordView(
                String tasterId, String tasterName, String tag, String avatar, String avatarColor, String note) {
            this(
                    tasterId,
                    tasterName,
                    tag,
                    avatar,
                    avatarColor,
                    note,
                    List.of(),
                    List.of(),
                    Map.of(),
                    List.of(),
                    List.of(),
                    RecordVisibility.PUBLIC,
                    1,
                    null);
        }
    }

    /** photo는 메뉴 사진 주소입니다. 비공개 기록이면 만료 서명이 붙은 주소입니다. */
    public record MenuView(String name, Integer price, String photo) {}
}
