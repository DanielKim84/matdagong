package kr.matdagong.place.application;

import java.util.List;
import java.util.Locale;
import kr.matdagong.place.api.PlaceView;
import kr.matdagong.place.api.PlaceView.TasterRecordView;
import org.springframework.stereotype.Component;

/** 실제 장소 DB가 연결되기 전까지 화면 개발에 사용할 읽기 전용 샘플 목록입니다. */
@Component
public class SamplePlaceCatalog {
    private final List<PlaceView> places = List.of(
            place("p-001", "연남옥", "한식 · 국밥", "서울 마포구 동교로 251", 37.5637, 126.9254, "🍲", "#ead3bb", "2026.10.12", "맑고 깊은 국물. 혼자 와도 편안해서 자주 생각나요.",
                    taster("u-01", "박지원", "연남의 작은 식당을 찾아요", "지", "#ead5c7", "맑고 깊은 국물에 밥 한 공기. 혼자 와도 편안한 분위기라 자주 생각나요."),
                    taster("u-02", "김민서", "계절을 담은 한 그릇", "민", "#dce7ce", "자극적이지 않고 오래 먹을 수 있는 따뜻한 국밥.")),
            place("p-002", "소금집델리", "델리 · 샌드위치", "서울 마포구 연남동 223-38", 37.5653, 126.9230, "🥪", "#e9d8bc", "2026.10.08", "잠봉뵈르의 버터 향과 바삭한 빵이 잘 어울려요.",
                    taster("u-01", "박지원", "연남의 작은 식당을 찾아요", "지", "#ead5c7", "가벼운 점심으로 다시 올 곳. 버터 향이 좋아요.")),
            place("p-003", "산동만두", "중식 · 만두", "서울 마포구 연희로 12", 37.5671, 126.9277, "🥟", "#e9c9b4", "2026.10.03", "뜨거울 때 먹는 만두와 오이무침 조합이 좋았습니다.",
                    taster("u-02", "김민서", "계절을 담은 한 그릇", "민", "#dce7ce", "육즙 가득한 만두와 산뜻한 오이무침."),
                    taster("u-04", "김동우", "동네의 좋은 한 끼", "동", "#e4ebd7", "따뜻할 때 한입 베어 물면 육즙이 가득해요.")),
            place("p-004", "카페 레이어드", "카페 · 베이커리", "서울 마포구 성미산로 161-4", 37.5651, 126.9298, "🥐", "#e2d9c7", "2026.09.28", "스콘을 고르는 시간부터 즐거운 곳. 창가 자리에 앉아 쉬기 좋아요.",
                    taster("u-03", "최유진", "느긋한 브런치 수집가", "유", "#e4dff0", "창가 자리에서 스콘과 커피를 천천히 즐겨요.")),
            place("p-005", "오브젝트", "카페 · 브런치", "서울 마포구 연남동 240-1", 37.5624, 126.9291, "☕", "#d8dfcf", "2026.09.20", "주말 아침 느긋하게 브런치를 먹고 싶은 날.",
                    taster("u-03", "최유진", "느긋한 브런치 수집가", "유", "#e4dff0", "혼자 가도 편하고, 커피가 부드러워요.")),
            place("p-006", "면의 온도", "면 요리 · 우동", "서울 마포구 와우산로 29", 37.5608, 126.9312, "🍜", "#e3d3bd", "2026.09.14", "쫄깃한 면과 깔끔한 국물. 비 오는 날 다시 찾고 싶은 곳.",
                    taster("u-01", "박지원", "연남의 작은 식당을 찾아요", "지", "#ead5c7", "깔끔한 국물이라 부담 없이 한 그릇 먹기 좋아요."),
                    taster("u-04", "김동우", "동네의 좋은 한 끼", "동", "#e4ebd7", "비 오는 날 다시 찾고 싶은 우동.")),
            place("p-007", "작은 국수집", "한식 · 국수", "서울 마포구 동교로 41", 37.5618, 126.9210, "🍜", "#e1d7c4", "2026.09.11", "멸치 향이 은은한 국물과 부드러운 면.",
                    taster("u-02", "김민서", "계절을 담은 한 그릇", "민", "#dce7ce", "동네에서 편하게 먹는 따뜻한 한 그릇.")),
            place("p-008", "정미소 밥상", "한식 · 백반", "서울 마포구 성미산로 53", 37.5677, 126.9204, "🍚", "#d9e1c9", "2026.09.02", "매일 달라지는 반찬과 정갈한 밥.",
                    taster("u-01", "박지원", "연남의 작은 식당을 찾아요", "지", "#ead5c7", "따뜻한 집밥이 생각날 때 다시 오고 싶어요."))
    );

    public List<PlaceView> findAll(String query) {
        if (query == null || query.isBlank()) return places;
        // 샘플 데이터만 다루므로 DB 없이 이름, 분류, 주소를 대소문자 구분 없이 검색합니다.
        String normalized = query.trim().toLowerCase(Locale.ROOT);
        return places.stream()
                .filter(place -> place.name().toLowerCase(Locale.ROOT).contains(normalized)
                        || place.category().toLowerCase(Locale.ROOT).contains(normalized)
                        || place.address().toLowerCase(Locale.ROOT).contains(normalized))
                .toList();
    }

    public PlaceView findById(String id) {
        return places.stream().filter(place -> place.id().equals(id)).findFirst().orElse(null);
    }

    private static PlaceView place(String id, String name, String category, String address,
                                   double latitude, double longitude, String emoji, String color,
                                   String visitedOn, String recentNote, TasterRecordView... tasters) {
        return new PlaceView(id, name, category, address, latitude, longitude, emoji, color,
                visitedOn, recentNote, tasters.length, List.of(tasters));
    }

    private static TasterRecordView taster(String id, String name, String tag, String avatar,
                                           String color, String note) {
        return new TasterRecordView(id, name, tag, avatar, color, note);
    }
}
