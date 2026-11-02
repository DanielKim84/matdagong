package kr.matdagong.place.catalog;

import static kr.matdagong.place.catalog.PlaceModels.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 샘플 장소 기록에 메뉴·취향 태그·매장 정보·기록 시각을 채워, 화면 개발 중에도 실제 기록과 같은 상세 화면을 보게 합니다.
 * 사진은 화면 정적 파일(frontend/public/assets/sample-food)의 예시 이미지를 씁니다. 실제 가게 사진이 아닙니다.
 */
final class SampleRecordDetails {
    private SampleRecordDetails() {}

    private record Detail(List<MenuView> menus, List<String> tags, List<String> visitConditions) {}

    /** 태그 이름 → 묶음. community-service의 taste_tags 묶음과 같은 값을 씁니다. */
    private static final Map<String, String> TAG_GROUPS = Map.ofEntries(
            Map.entry("한식", "CUISINE"),
            Map.entry("중식", "CUISINE"),
            Map.entry("일식", "CUISINE"),
            Map.entry("양식", "CUISINE"),
            Map.entry("백반", "CUISINE"),
            Map.entry("집밥·가정식", "CUISINE"),
            Map.entry("커피", "CAFE"),
            Map.entry("베이커리", "CAFE"),
            Map.entry("디저트", "CAFE"),
            Map.entry("브런치", "CAFE"),
            Map.entry("케이크", "CAFE"),
            Map.entry("가성비", "OCCASION"),
            Map.entry("혼밥", "OCCASION"),
            Map.entry("데이트", "OCCASION"),
            Map.entry("가족 외식", "OCCASION"),
            Map.entry("조용한 곳", "OCCASION"),
            Map.entry("뷰 좋은 곳", "OCCASION"),
            Map.entry("단체 모임", "OCCASION"),
            Map.entry("국물", "TASTE"),
            Map.entry("담백한 맛", "TASTE"),
            Map.entry("고소한 맛", "TASTE"),
            Map.entry("달콤한 맛", "TASTE"),
            Map.entry("짭짤한 맛", "TASTE"),
            Map.entry("새콤한 맛", "TASTE"));

    private static final String PHOTO_BASE = "/assets/sample-food/";

    /** "장소ID:맛객ID 끝자리" → 그 맛객이 올린 예시 사진 */
    private static final Map<String, List<String>> PHOTOS = Map.ofEntries(
            photos("p-001:1", "korean-table", "table-spread"),
            photos("p-001:4", "table-spread"),
            photos("p-002:5", "cafe-street", "cafe-pastry"),
            photos("p-003:2", "spicy-chicken", "korean-table"),
            photos("p-003:3", "table-spread"),
            photos("p-004:3", "cafe-pastry", "cafe-street"),
            photos("p-004:5", "cafe-pastry"),
            photos("p-005:1", "cafe-street"),
            photos("p-005:3", "cafe-pastry", "picnic-snack"),
            photos("p-006:2", "spicy-seafood"),
            photos("p-006:4", "korean-table"),
            photos("p-007:2", "table-spread", "korean-table"),
            photos("p-007:5", "korean-table"),
            photos("p-008:1", "korean-table"),
            photos("p-008:4", "table-spread", "pork-belly"),
            photos("p-009:2", "spicy-chicken", "grilled-steak"),
            photos("p-010:3", "spicy-seafood"),
            photos("p-011:4", "table-spread", "korean-table"),
            photos("p-012:5", "cafe-pastry", "cafe-street"));

    /**
     * "장소ID:맛객ID 끝자리" → 메뉴 사진(메뉴 순서대로, 사진이 없는 메뉴는 빈 문자열).
     * 같은 기록의 대표 사진과 겹치지 않게 고릅니다(겹치면 화면이 대표 사진으로 묶어 메뉴 이름이 안 보임).
     */
    private static final Map<String, List<String>> MENU_PHOTOS = Map.ofEntries(
            photos("p-001:1", "pork-belly", "grilled-steak"),
            photos("p-001:4", "korean-table"),
            photos("p-002:5", "picnic-snack", ""),
            photos("p-003:2", "pork-belly", ""),
            photos("p-003:3", "pork-belly", "spicy-seafood"),
            photos("p-004:3", "picnic-snack", ""),
            photos("p-004:5", "cafe-street"),
            photos("p-005:1", "picnic-snack"),
            photos("p-005:3", "cafe-street", ""),
            photos("p-006:2", "grilled-steak", "spicy-chicken"),
            photos("p-006:4", "spicy-chicken"),
            photos("p-007:2", "spicy-chicken", "pork-belly"),
            photos("p-007:5", "table-spread"),
            photos("p-008:1", "table-spread"),
            photos("p-008:4", "grilled-steak", "spicy-chicken"),
            photos("p-009:2", "pork-belly", "spicy-seafood"),
            photos("p-010:3", "korean-table", ""),
            photos("p-011:4", "pork-belly", ""),
            photos("p-012:5", "picnic-snack", ""));

    /** "장소ID:맛객ID 끝자리" → 그 맛객이 남긴 기록 내용 */
    private static final Map<String, Detail> DETAILS = Map.ofEntries(
            detail("p-001:1", menus("돼지국밥", 10000, "수육 한 접시", 18000), tags("한식", "국물", "혼밥"), conditions("친절 경험")),
            detail("p-001:4", menus("순대국밥", 10000), tags("한식", "담백한 맛", "가성비"), conditions("늦게까지 영업")),
            detail("p-002:5", menus("잠봉뵈르", 12500, "하몽 샌드위치", 13500), tags("양식", "고소한 맛", "혼밥"), conditions("친절 경험")),
            detail("p-003:2", menus("고기만두", 8000, "오이무침", 5000), tags("중식", "짭짤한 맛", "가성비"), conditions("브레이크타임 있음")),
            detail("p-003:3", menus("군만두", 8000, "물만두", 7000), tags("중식", "고소한 맛", "단체 모임"), conditions("예약 권장")),
            detail("p-004:3", menus("플레인 스콘", 3800, "아메리카노", 4500), tags("베이커리", "커피", "조용한 곳"), conditions("친절 경험")),
            detail("p-004:5", menus("얼그레이 스콘", 4200, "라떼", 5000), tags("베이커리", "디저트", "데이트"), conditions("주차 불가")),
            detail("p-005:1", menus("브런치 플레이트", 16000), tags("브런치", "커피", "데이트"), conditions("예약 권장")),
            detail("p-005:3", menus("프렌치토스트", 13000, "핸드드립", 6000), tags("브런치", "달콤한 맛", "혼밥"), conditions("친절 경험")),
            detail("p-006:2", menus("붓카케 우동", 9500, "새우튀김", 4000), tags("일식", "국물", "혼밥"), conditions("늦게까지 영업")),
            detail("p-006:4", menus("카레 우동", 10500), tags("일식", "짭짤한 맛", "가성비"), conditions("브레이크타임 있음")),
            detail("p-007:2", menus("잔치국수", 7000, "비빔국수", 8000), tags("한식", "국물", "가성비"), conditions("친절 경험")),
            detail("p-007:5", menus("멸치국수", 7000), tags("한식", "담백한 맛", "혼밥"), conditions("주차 공간 협소")),
            detail("p-008:1", menus("된장찌개 정식", 10000), tags("백반", "한식", "혼밥"), conditions("늦게까지 영업")),
            detail(
                    "p-008:4",
                    menus("제육 정식", 11000, "고등어구이 정식", 12000),
                    tags("백반", "집밥·가정식", "가성비"),
                    conditions("친절 경험")),
            detail("p-009:2", menus("치킨 카레", 11000, "돈카츠 카레", 13000), tags("일식", "고소한 맛", "혼밥"), conditions("늦게까지 영업")),
            detail("p-010:3", menus("냉소바", 11000, "온소바", 11000), tags("일식", "담백한 맛", "조용한 곳"), conditions("브레이크타임 있음")),
            detail(
                    "p-011:4",
                    menus("오늘의 가정식", 10000, "계란말이", 6000),
                    tags("집밥·가정식", "한식", "가족 외식"),
                    conditions("주차 편리")),
            detail("p-012:5", menus("소금빵", 3500, "바닐라 크림빵", 4500), tags("베이커리", "디저트", "커피"), conditions("친절 경험")));

    /** 샘플 기록에 내용을 채웁니다. 기록 시각은 장소 방문일에서 맛객 순서만큼 하루씩 앞당겨 정합니다. */
    static List<TasterRecordView> enrich(String placeId, String visitedOn, List<TasterRecordView> tasters) {
        LocalDate visited = LocalDate.parse(visitedOn, DateTimeFormatter.ofPattern("yyyy.MM.dd"));
        List<TasterRecordView> result = new ArrayList<>();
        for (int index = 0; index < tasters.size(); index++) {
            TasterRecordView taster = tasters.get(index);
            String tasterId = taster.tasterId();
            String key = placeId + ":" + tasterId.substring(tasterId.length() - 1);
            Detail detail = DETAILS.get(key);
            String recordedAt = OffsetDateTime.of(visited.minusDays(index), LocalTime.of(12, 30), ZoneOffset.ofHours(9))
                    .toString();
            if (detail == null) {
                result.add(withRecordedAt(taster, recordedAt));
                continue;
            }
            Map<String, String> tagGroups = new LinkedHashMap<>();
            detail.tags().forEach(tag -> tagGroups.put(tag, TAG_GROUPS.getOrDefault(tag, "TASTE")));
            result.add(new TasterRecordView(
                    tasterId,
                    taster.tasterName(),
                    String.join(" · ", detail.tags()),
                    taster.avatar(),
                    taster.avatarColor(),
                    taster.note(),
                    withMenuPhotos(detail.menus(), MENU_PHOTOS.getOrDefault(key, List.of())),
                    detail.tags(),
                    tagGroups,
                    detail.visitConditions(),
                    PHOTOS.getOrDefault(key, List.of()),
                    taster.visibility(),
                    taster.placeCount(),
                    recordedAt));
        }
        return List.copyOf(result);
    }

    private static List<MenuView> withMenuPhotos(List<MenuView> menus, List<String> photos) {
        List<MenuView> result = new ArrayList<>();
        for (int index = 0; index < menus.size(); index++) {
            MenuView menu = menus.get(index);
            String photo = index < photos.size() && !photos.get(index).isEmpty() ? photos.get(index) : null;
            result.add(new MenuView(menu.name(), menu.price(), photo));
        }
        return List.copyOf(result);
    }

    private static TasterRecordView withRecordedAt(TasterRecordView taster, String recordedAt) {
        return new TasterRecordView(
                taster.tasterId(),
                taster.tasterName(),
                taster.tag(),
                taster.avatar(),
                taster.avatarColor(),
                taster.note(),
                taster.menus(),
                taster.tags(),
                taster.tagGroups(),
                taster.visitConditions(),
                taster.photos(),
                taster.visibility(),
                taster.placeCount(),
                recordedAt);
    }

    private static Map.Entry<String, Detail> detail(
            String key, List<MenuView> menus, List<String> tags, List<String> visitConditions) {
        return Map.entry(key, new Detail(menus, tags, visitConditions));
    }

    /** (메뉴 이름, 가격) 쌍을 차례로 받습니다. */
    private static List<MenuView> menus(Object... nameAndPrice) {
        List<MenuView> menus = new ArrayList<>();
        for (int i = 0; i < nameAndPrice.length; i += 2) {
            menus.add(new MenuView((String) nameAndPrice[i], (Integer) nameAndPrice[i + 1], null));
        }
        return List.copyOf(menus);
    }

    private static Map.Entry<String, List<String>> photos(String key, String... names) {
        return Map.entry(
                key,
                Arrays.stream(names)
                        .map(name -> name.isEmpty() ? "" : PHOTO_BASE + name + ".jpg")
                        .toList());
    }

    private static List<String> tags(String... tags) {
        return List.of(tags);
    }

    private static List<String> conditions(String... conditions) {
        return List.of(conditions);
    }
}
