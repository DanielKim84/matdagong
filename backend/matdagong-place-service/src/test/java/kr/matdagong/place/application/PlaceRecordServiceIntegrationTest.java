package kr.matdagong.place.application;

import static org.assertj.core.api.Assertions.assertThat;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import kr.matdagong.place.api.CreatePlaceRecordRequest;
import kr.matdagong.place.api.PlaceView;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

/** 실제 PostgreSQL에 Flyway 스키마를 적용하고 장소 기록 저장·조회 SQL을 검증합니다. */
class PlaceRecordServiceIntegrationTest {
    private static final String PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    private static final UUID FIRST = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SECOND = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final CommunityProfileClient.AuthorProfile FIRST_AUTHOR = new CommunityProfileClient.AuthorProfile("첫맛객", 3);
    private static final CommunityProfileClient.AuthorProfile SECOND_AUTHOR = new CommunityProfileClient.AuthorProfile("둘맛객", 5);

    private static EmbeddedPostgres postgres;
    private static DataSource dataSource;
    private JdbcTemplate jdbc;
    private PlaceRecordService service;

    @BeforeAll
    static void startDatabase() throws IOException {
        postgres = EmbeddedPostgres.start();
        dataSource = postgres.getPostgresDatabase();
        Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();
    }

    @AfterAll
    static void stopDatabase() throws IOException {
        if (postgres != null) postgres.close();
    }

    @BeforeEach
    void setUp() {
        jdbc = new JdbcTemplate(dataSource);
        jdbc.update("TRUNCATE restaurant_places, user_place_likes, user_recent_places, place_quick_drafts CASCADE");
        MediaUrlSigner signer = new MediaUrlSigner("integration-key", Duration.ofHours(6), java.time.Clock.systemUTC());
        service = new PlaceRecordService(jdbc, new SamplePlaceCatalog(), new PlaceViewLoader(jdbc, signer));
    }

    @Test
    void 비공개_기록_사진은_base64가_아닌_서명_주소로_내려가고_다른_사람에게는_보이지_않는다() {
        PlaceView created = service.createRecord(FIRST, FIRST_AUTHOR, unverified("국밥집"), request("국밥집", "PRIVATE",
                List.of(new CreatePlaceRecordRequest.MenuInput("국밥", 9000, PNG)), List.of(PNG)));

        PlaceView.TasterRecordView mine = service.findMine(FIRST).get(0).tasters().get(0);
        assertThat(mine.tasterName()).isEqualTo("첫맛객");
        assertThat(mine.photos()).singleElement().asString()
                .startsWith("/media/place-record-photos/").contains("?exp=").contains("&sig=");
        assertThat(mine.menus().get(0).photo()).startsWith("/media/place-menu-photos/").contains("?exp=");

        assertThat(service.findAll(null, SECOND)).noneMatch(place -> place.id().equals(created.id()));
        assertThat(service.findById(created.id(), SECOND).tasters()).isEmpty();
    }

    @Test
    void 사진_있는_메뉴_앞에_새_메뉴를_넣어_수정해도_순번이_충돌하지_않는다() {
        service.createRecord(FIRST, FIRST_AUTHOR, unverified("국밥집"), request("국밥집", "PRIVATE",
                List.of(new CreatePlaceRecordRequest.MenuInput("국밥", 9000, PNG)), List.of(PNG)));
        PlaceView.TasterRecordView before = service.findMine(FIRST).get(0).tasters().get(0);

        // 화면은 기존 사진을 서명 주소 그대로 다시 보냅니다.
        service.createRecord(FIRST, FIRST_AUTHOR, unverified("국밥집"), request("국밥집", "PUBLIC", List.of(
                new CreatePlaceRecordRequest.MenuInput("만두", 6000, null),
                new CreatePlaceRecordRequest.MenuInput("국밥", 9500, before.menus().get(0).photo())), before.photos()));

        PlaceView.TasterRecordView after = service.findMine(FIRST).get(0).tasters().get(0);
        assertThat(after.menus()).extracting(PlaceView.MenuView::name).containsExactly("만두", "국밥");
        assertThat(after.menus().get(1).photo()).matches("^/media/place-menu-photos/[0-9a-f-]{36}$");
        assertThat(after.photos()).singleElement().asString().matches("^/media/place-record-photos/[0-9a-f-]{36}$");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM restaurant_record_photos", Integer.class)).isEqualTo(1);
    }

    @Test
    void 같은_가게를_여러_맛객이_등록하면_기록은_각자_쌓이고_가게_정보는_카카오_확인_값으로만_바뀐다() {
        PlaceView created = service.createRecord(FIRST, FIRST_AUTHOR, unverified("국밥집"), request("국밥집", "PUBLIC", List.of(), List.of(PNG)));

        service.createRecord(SECOND, SECOND_AUTHOR, unverified("폐업"), request("폐업", "PUBLIC", List.of(), List.of(PNG)));
        PlaceView afterUnverified = service.findById(created.id(), SECOND);
        assertThat(afterUnverified.name()).isEqualTo("국밥집");
        assertThat(afterUnverified.recordCount()).isEqualTo(2);
        assertThat(afterUnverified.tasters()).extracting(PlaceView.TasterRecordView::tasterName)
                .containsExactlyInAnyOrder("첫맛객", "둘맛객");

        service.createRecord(SECOND, SECOND_AUTHOR, verified("국밥집 본점"), request("국밥집 본점", "PUBLIC", List.of(), List.of(PNG)));
        PlaceView afterVerified = service.findAll(null, FIRST).stream()
                .filter(place -> place.id().equals(created.id())).findFirst().orElseThrow();
        assertThat(afterVerified.name()).isEqualTo("국밥집 본점");
        assertThat(afterVerified.recordCount()).isEqualTo(2);
        assertThat(afterVerified.tasters()).allSatisfy(taster -> assertThat(taster.placeCount()).isEqualTo(1));
    }

    @Test
    void 최근_본_장소는_샘플과_DB_장소를_본_순서대로_함께_돌려준다() {
        PlaceView created = service.createRecord(FIRST, FIRST_AUTHOR, unverified("국밥집"), request("국밥집", "PUBLIC", List.of(), List.of(PNG)));
        String sampleId = new SamplePlaceCatalog().findAll(null).get(0).id();

        service.rememberRecent(SECOND, created.id());
        jdbc.update("UPDATE user_recent_places SET viewed_at = now() - INTERVAL '1 minute'");
        service.rememberRecent(SECOND, sampleId);

        assertThat(service.findRecent(SECOND)).extracting(PlaceView::id).containsExactly(sampleId, created.id());
    }

    private static KakaoPlaceVerifier.PlaceInfo unverified(String name) {
        return new KakaoPlaceVerifier.PlaceInfo(name, "서울 중구 을지로 1", 37.566, 126.991, null, null, "서울 중구 을지로 1", null, false);
    }

    private static KakaoPlaceVerifier.PlaceInfo verified(String name) {
        return new KakaoPlaceVerifier.PlaceInfo(name, "서울 중구 을지로 2", 37.567, 126.992, "02-000-0000",
                "http://place.map.kakao.com/1001", "서울 중구 을지로 2", null, true);
    }

    private static CreatePlaceRecordRequest request(String name, String visibility,
                                                    List<CreatePlaceRecordRequest.MenuInput> menus, List<String> photos) {
        return new CreatePlaceRecordRequest("KAKAO", "1001", name, "한식", "서울 중구 을지로 1", 37.566, 126.991,
                null, null, "서울 중구 을지로 1", null, "국물이 진하고 맛있어요.", visibility,
                menus, List.of("국물"), Map.of("국물", "TASTE"), List.of("혼밥"), photos);
    }
}
