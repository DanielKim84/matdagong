package kr.matdagong.place.api;

import java.util.List;

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
        List<TasterRecordView> tasters
) {
    public record TasterRecordView(
            String tasterId,
            String tasterName,
            String tag,
            String avatar,
            String avatarColor,
            String note
    ) {}
}
