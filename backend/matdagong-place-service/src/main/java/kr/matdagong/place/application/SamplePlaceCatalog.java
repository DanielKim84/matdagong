package kr.matdagong.place.application;

import java.util.List;
import java.util.Locale;
import kr.matdagong.place.api.PlaceView;
import kr.matdagong.place.api.PlaceView.TasterRecordView;
import org.springframework.stereotype.Component;

/** 실제 장소 DB가 연결되기 전까지 화면 개발에 사용할 읽기 전용 샘플 목록입니다. */
@Component
public class SamplePlaceCatalog {
    // 샘플 장소 작성자 ID는 dev/seed-community-test-users.sql의 테스트 프로필과 맞춥니다.
    private static final String ALLEY_TASTER_ID = "20000000-0000-4000-8000-000000000001";
    private static final String NOODLE_TASTER_ID = "20000000-0000-4000-8000-000000000002";
    private static final String WEEKEND_TASTER_ID = "20000000-0000-4000-8000-000000000003";
    private static final String MEAL_TASTER_ID = "20000000-0000-4000-8000-000000000004";
    private static final String DESSERT_TASTER_ID = "20000000-0000-4000-8000-000000000005";

    private final List<PlaceView> places = List.of(
            place("p-001", "연남옥", "한식 · 국밥", "서울 마포구 동교로 251", 37.5637, 126.9254, "🍲", "#ead3bb", "2026.10.12", "맑고 깊은 국물. 혼자 와도 편안해서 자주 생각나요.",
                    taster(ALLEY_TASTER_ID, "골목맛객 민지", "동네 골목의 오래된 맛집", "민", "#ead5c7", "맑고 깊은 국물에 밥 한 공기. 혼자 와도 편안한 분위기라 자주 생각나요."),
                    taster(MEAL_TASTER_ID, "든든한 한끼 연구소", "정갈하고 든든한 한 끼", "한", "#e4ebd7", "자극적이지 않고 오래 먹을 수 있는 따뜻한 국밥.")),
            place("p-002", "소금집델리", "델리 · 샌드위치", "서울 마포구 연남동 223-38", 37.5653, 126.9230, "🥪", "#e9d8bc", "2026.10.08", "잠봉뵈르의 버터 향과 바삭한 빵이 잘 어울려요.",
                    taster(DESSERT_TASTER_ID, "달콤한 디저트 지도", "카페와 디저트 가게를 모아요", "달", "#f2dce8", "가벼운 점심으로 다시 올 곳. 버터 향이 좋아요.")),
            place("p-003", "산동만두", "중식 · 만두", "서울 마포구 연희로 12", 37.5671, 126.9277, "🥟", "#e9c9b4", "2026.10.03", "뜨거울 때 먹는 만두와 오이무침 조합이 좋았습니다.",
                    taster(NOODLE_TASTER_ID, "면요리 탐험가", "국수와 면 요리를 찾아다녀요", "면", "#dce7ce", "육즙 가득한 만두와 산뜻한 오이무침."),
                    taster(WEEKEND_TASTER_ID, "주말 미식 산책", "주말마다 새로운 동네를 걸어요", "주", "#e4dff0", "따뜻할 때 한입 베어 물면 육즙이 가득해요.")),
            place("p-004", "카페 레이어드", "카페 · 베이커리", "서울 마포구 성미산로 161-4", 37.5651, 126.9298, "🥐", "#e2d9c7", "2026.09.28", "스콘을 고르는 시간부터 즐거운 곳. 창가 자리에 앉아 쉬기 좋아요.",
                    taster(WEEKEND_TASTER_ID, "주말 미식 산책", "주말마다 새로운 동네를 걸어요", "주", "#e4dff0", "창가 자리에서 스콘과 커피를 천천히 즐겨요."),
                    taster(DESSERT_TASTER_ID, "달콤한 디저트 지도", "카페와 디저트 가게를 모아요", "달", "#f2dce8", "스콘을 고르는 시간부터 즐거운 곳. 창가 자리에 앉아 쉬기 좋아요.")),
            place("p-005", "오브젝트", "카페 · 브런치", "서울 마포구 연남동 240-1", 37.5624, 126.9291, "☕", "#d8dfcf", "2026.09.20", "주말 아침 느긋하게 브런치를 먹고 싶은 날.",
                    taster(ALLEY_TASTER_ID, "골목맛객 민지", "동네 골목의 오래된 맛집", "민", "#ead5c7", "주말 아침 느긋하게 브런치를 먹기 좋아요."),
                    taster(WEEKEND_TASTER_ID, "주말 미식 산책", "주말마다 새로운 동네를 걸어요", "주", "#e4dff0", "혼자 가도 편하고, 커피가 부드러워요.")),
            place("p-006", "면의 온도", "면 요리 · 우동", "서울 마포구 와우산로 29", 37.5608, 126.9312, "🍜", "#e3d3bd", "2026.09.14", "쫄깃한 면과 깔끔한 국물. 비 오는 날 다시 찾고 싶은 곳.",
                    taster(NOODLE_TASTER_ID, "면요리 탐험가", "국수와 면 요리를 찾아다녀요", "면", "#dce7ce", "깔끔한 국물이라 부담 없이 한 그릇 먹기 좋아요."),
                    taster(MEAL_TASTER_ID, "든든한 한끼 연구소", "정갈하고 든든한 한 끼", "한", "#e4ebd7", "비 오는 날 다시 찾고 싶은 우동.")),
            place("p-007", "작은 국수집", "한식 · 국수", "서울 마포구 동교로 41", 37.5618, 126.9210, "🍜", "#e1d7c4", "2026.09.11", "멸치 향이 은은한 국물과 부드러운 면.",
                    taster(NOODLE_TASTER_ID, "면요리 탐험가", "국수와 면 요리를 찾아다녀요", "면", "#dce7ce", "동네에서 편하게 먹는 따뜻한 한 그릇."),
                    taster(DESSERT_TASTER_ID, "달콤한 디저트 지도", "카페와 디저트 가게를 모아요", "달", "#f2dce8", "면 요리 뒤에 디저트 코스까지 즐겨요.")),
            place("p-008", "정미소 밥상", "한식 · 백반", "서울 마포구 성미산로 53", 37.5677, 126.9204, "🍚", "#d9e1c9", "2026.09.02", "매일 달라지는 반찬과 정갈한 밥.",
                    taster(ALLEY_TASTER_ID, "골목맛객 민지", "동네 골목의 오래된 맛집", "민", "#ead5c7", "따뜻한 집밥이 생각날 때 다시 오고 싶어요."),
                    taster(MEAL_TASTER_ID, "든든한 한끼 연구소", "정갈하고 든든한 한 끼", "한", "#e4ebd7", "매일 달라지는 반찬과 정갈한 밥이 좋아요.")),
            place("p-009", "연희동 작은 카레집", "일식 · 카레", "서울 서대문구 연희로 87", 37.5685, 126.9309, "🍛", "#e9d8b4", "2026.08.29", "향신료가 과하지 않아 자주 찾게 돼요.",
                    taster(NOODLE_TASTER_ID, "면요리 탐험가", "국수와 면 요리라면 어디든 찾아갑니다", "면", "#dce7ce", "밥과 함께 먹기 좋은 부드러운 카레.")),
            place("p-010", "망원 소바정", "일식 · 소바", "서울 마포구 포은로 72", 37.5554, 126.9058, "🍜", "#e5d9c8", "2026.08.25", "더운 날 가볍게 먹기 좋은 메밀 소바.",
                    taster(WEEKEND_TASTER_ID, "주말 미식 산책", "주말마다 새로운 동네를 걸어요", "주", "#e4dff0", "산책하다 들르기 좋은 작은 소바집.")),
            adPlace("p-011", "망원 온기식탁", "한식 · 가정식", "서울 마포구 망원로 18", 37.5568, 126.9094, "🍚", "#ead9c1", "2026.08.18", "따뜻한 반찬과 편안한 분위기가 좋아요.",
                    taster(MEAL_TASTER_ID, "든든한 한끼 연구소", "정갈하고 든든한 밥집을 소개합니다", "한", "#e4ebd7", "오늘의 반찬 구성이 알차요.")),
            adPlace("p-012", "연남 오후의 빵", "카페 · 베이커리", "서울 마포구 동교로 267", 37.5630, 126.9273, "🥐", "#e6d3bf", "2026.08.12", "갓 구운 빵과 커피를 즐기기 좋아요.",
                    taster(DESSERT_TASTER_ID, "달콤한 디저트 지도", "카페와 디저트 가게를 모아요", "달", "#f2dce8", "오후에 들러 빵과 커피를 즐겼어요."))
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
                visitedOn, recentNote, tasters.length, visitConditions(id), false, List.of(tasters));
    }

    /** 광고 탭과 광고 마커를 확인할 수 있도록 개발 목록에만 노출하는 샘플입니다. */
    private static PlaceView adPlace(String id, String name, String category, String address,
                                     double latitude, double longitude, String emoji, String color,
                                     String visitedOn, String recentNote, TasterRecordView... tasters) {
        return new PlaceView(id, name, category, address, latitude, longitude, emoji, color,
                visitedOn, recentNote, tasters.length, visitConditions(id), true, List.of(tasters));
    }

    // 개발 샘플에서 제외 조건 기능을 확인할 수 있도록 일부 장소에 방문 조건을 둡니다.
    private static List<String> visitConditions(String id) {
        return switch (id) {
            case "p-001" -> List.of("웨이팅 있는 곳");
            case "p-002" -> List.of("주차 불가");
            case "p-003" -> List.of("주차 공간 협소");
            case "p-004" -> List.of("노키즈존");
            case "p-005" -> List.of("불친절 경험");
            default -> List.of();
        };
    }

    private static TasterRecordView taster(String id, String name, String tag, String avatar,
                                           String color, String note) {
        return new TasterRecordView(id, name, tag, avatar, color, note);
    }
}
