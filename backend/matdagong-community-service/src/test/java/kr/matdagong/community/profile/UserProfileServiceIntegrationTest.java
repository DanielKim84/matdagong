package kr.matdagong.community.profile;

import static kr.matdagong.community.profile.ProfileModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.common.web.ApiErrors;
import kr.matdagong.community.tastetag.TasteTagModels.TagRequest;
import kr.matdagong.community.tastetag.TasteTagModels.TagRequestType;
import kr.matdagong.community.tastetag.TasteTagRequestService;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** 프로필 생성·수정과 태그 규칙, 프로필이 없을 때의 오류 응답을 실제 스키마로 확인합니다. */
class UserProfileServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID FIRST = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SECOND = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID THIRD = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final String INSERT_PROFILE =
            "INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, ?, 1)";
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00};

    private UserProfileService profiles;
    private ProfileImageService images;
    private ProfileCoverService covers;

    @BeforeEach
    void setUp() {
        truncate("user_profiles");
        images = new ProfileImageService(jdbc);
        covers = new ProfileCoverService(jdbc, images);
        profiles = new UserProfileService(jdbc);
    }

    @Test
    void 프로필을_만들면_기본_소개를_쓰고_다른_계정과_겹친_닉네임에는_계정_ID를_붙인다() {
        ProfileView first = profiles.ensureProfile(FIRST, " 국밥러 ");
        ProfileView second = profiles.ensureProfile(SECOND, "국밥러");

        assertThat(first.nickname()).isEqualTo("국밥러");
        assertThat(first.intro()).isEqualTo(DEFAULT_INTRO);
        assertThat(first.tasterFocus()).isEqualTo(FoodFocus.BOTH);
        assertThat(first.activityScope()).isEqualTo(ActivityScope.LOCAL);
        assertThat(second.nickname()).isEqualTo("국밥러-222222");
        // 이미 있는 프로필은 다시 만들 때 닉네임을 덮어쓰지 않습니다.
        assertThat(profiles.ensureProfile(FIRST, "새이름").nickname()).isEqualTo("국밥러");
        assertThat(profiles.findProfile(UUID.randomUUID())).isEmpty();
    }

    @Test
    void 자동_닉네임은_계정_ID_접미사까지_겹치면_무작위_접미사로_만든다() {
        profiles.ensureProfile(FIRST, "국밥러");
        insertProfile(THIRD, "국밥러-222222");

        String nickname = profiles.ensureProfile(SECOND, "국밥러").nickname();

        assertThat(nickname).matches("국밥러-[0-9a-f]{6}").isNotEqualTo("국밥러-222222");
    }

    @Test
    void 자동_닉네임을_정하는_사이에_같은_닉네임이_먼저_저장되면_다음_후보로_만든다() throws Exception {
        ProfileView created = callBlockedByUncommitted(
                other -> other.update(INSERT_PROFILE, THIRD, "국밥러"), () -> profiles.ensureProfile(SECOND, "국밥러"));

        assertThat(created.nickname()).isEqualTo("국밥러-222222");
    }

    @Test
    void 닉네임을_바꾸는_사이에_다른_계정이_같은_닉네임을_먼저_저장하면_409로_안내한다() {
        profiles.ensureProfile(SECOND, "냉면러");

        assertStatus(
                () -> callBlockedByUncommitted(
                        other -> other.update(INSERT_PROFILE, THIRD, "국밥러"),
                        () -> profiles.updateProfile(SECOND, request("국밥러", null, List.of(), List.of(), List.of()))),
                HttpStatus.CONFLICT,
                UserProfileService.NICKNAME_TAKEN);
        assertThat(profiles.findProfile(SECOND).orElseThrow().nickname()).isEqualTo("냉면러");
    }

    @Test
    void 관심_분야에_맞는_태그만_저장하고_제외는_방문_조건만_받는다() {
        profiles.ensureProfile(FIRST, "국밥러");
        String cuisine = tagName(TasteTagGroup.CUISINE);
        String cafe = tagName(TasteTagGroup.CAFE);
        String visit = tagName(TasteTagGroup.VISIT);

        ProfileView updated = profiles.updateProfile(
                FIRST, request("국밥러", FoodFocus.RESTAURANT, List.of(cuisine), List.of(cuisine), List.of(visit)));

        assertThat(updated.tasterFocus()).isEqualTo(FoodFocus.RESTAURANT);
        assertThat(updated.profileTags()).containsExactly(cuisine);
        assertThat(updated.preferenceTags()).containsExactly(cuisine);
        assertThat(updated.excludedTags()).containsExactly(visit);
        assertStatus(
                () -> profiles.updateProfile(
                        FIRST, request("국밥러", FoodFocus.RESTAURANT, List.of(cafe), List.of(), List.of())),
                HttpStatus.BAD_REQUEST,
                "목록에 있는 취향 태그만 선택해 주세요.");
        assertStatus(
                () -> profiles.updateProfile(
                        FIRST, request("국밥러", FoodFocus.BOTH, List.of(), List.of(), List.of(cuisine))),
                HttpStatus.BAD_REQUEST,
                "목록에 있는 취향 태그만 선택해 주세요.");
    }

    @Test
    void 분류마다_정한_수까지만_고를_수_있다() {
        profiles.ensureProfile(FIRST, "국밥러");
        List<String> tenCuisines = tagNames(TasteTagGroup.CUISINE, 10);
        List<String> sixTastes = tagNames(TasteTagGroup.TASTE, 6);
        List<String> cafeAndTravel = List.of(tagName(TasteTagGroup.DESSERT), tagName(TasteTagGroup.TRAVEL));

        ProfileView restaurant = profiles.updateProfile(
                FIRST, request("국밥러", FoodFocus.RESTAURANT, tenCuisines, tenCuisines, List.of()));
        ProfileView cafe = profiles.updateProfile(
                FIRST, request("국밥러", FoodFocus.CAFE_DESSERT, cafeAndTravel, List.of(), List.of()));

        assertThat(restaurant.profileTags()).hasSize(10);
        assertThat(cafe.profileTags()).containsExactlyElementsOf(cafeAndTravel);
        assertStatus(
                () -> profiles.updateProfile(
                        FIRST, request("국밥러", FoodFocus.RESTAURANT, sixTastes, List.of(), List.of())),
                HttpStatus.BAD_REQUEST,
                "'맛·메뉴'에서는 최대 5개까지 선택할 수 있어요.");
    }

    @Test
    void 여행_위주_맛객은_활동_지역을_저장하지_않는다() {
        profiles.ensureProfile(FIRST, "국밥러");

        ProfileView local = profiles.updateProfile(FIRST, request("국밥러", null, List.of(), List.of(), List.of()));
        ProfileView travel = profiles.updateProfile(
                FIRST,
                new UpdateProfileRequest(
                        "국밥러", null, null, null, ActivityScope.TRAVEL, "마포", List.of(), List.of(), List.of()));

        assertThat(local.activityRegion()).isEqualTo("마포");
        assertThat(travel.activityRegion()).isNull();
        assertThat(travel.activityScope()).isEqualTo(ActivityScope.TRAVEL);
    }

    @Test
    void 다른_맛객이_쓰는_닉네임으로는_바꿀_수_없다() {
        profiles.ensureProfile(FIRST, "국밥러");
        profiles.ensureProfile(SECOND, "냉면러");

        assertStatus(
                () -> profiles.updateProfile(SECOND, request("국밥러", null, List.of(), List.of(), List.of())),
                HttpStatus.CONFLICT,
                UserProfileService.NICKNAME_TAKEN);
    }

    @Test
    void 프로필이_없으면_수정_이미지_태그_제안을_같은_409_문구로_안내한다() {
        MockMultipartFile image = new MockMultipartFile("file", "a.png", "image/png", PNG);
        TasteTagRequestService tagRequests = new TasteTagRequestService(jdbc);

        assertStatus(
                () -> profiles.updateProfile(FIRST, request("국밥러", null, List.of(), List.of(), List.of())),
                HttpStatus.CONFLICT,
                ApiErrors.PROFILE_REQUIRED);
        assertStatus(() -> images.saveAvatar(FIRST, image), HttpStatus.CONFLICT, ApiErrors.PROFILE_REQUIRED);
        assertStatus(() -> covers.addCovers(FIRST, List.of(image)), HttpStatus.CONFLICT, ApiErrors.PROFILE_REQUIRED);
        assertStatus(
                () -> tagRequests.create(FIRST, new TagRequest(TagRequestType.TAG, "새 태그", TasteTagGroup.TASTE, null)),
                HttpStatus.CONFLICT,
                ApiErrors.PROFILE_REQUIRED);
    }

    @Test
    void 배경_사진은_순서대로_쌓이고_지우면_순번을_다시_매긴다() throws Exception {
        profiles.ensureProfile(FIRST, "국밥러");
        MockMultipartFile image = new MockMultipartFile("files", "a.png", "image/png", PNG);
        MockMultipartFile notImage = new MockMultipartFile("files", "a.png", "image/png", new byte[] {1, 2, 3});

        List<String> urls = covers.addCovers(FIRST, List.of(image, image, image));
        UUID firstPhoto = photoId(urls.get(0));
        covers.removeCover(FIRST, firstPhoto);
        covers.removeCover(FIRST, firstPhoto);

        assertThat(urls).hasSize(3);
        assertThat(profiles.findProfile(FIRST).orElseThrow().profileCoverUrls())
                .containsExactlyElementsOf(urls.subList(1, 3));
        assertThat(jdbc.queryForList(
                        "SELECT sort_no FROM user_profile_cover_photos WHERE account_id = ? ORDER BY sort_no",
                        Integer.class,
                        FIRST))
                .containsExactly(0, 1);

        // 가운데 사진을 지워도 남은 사진의 앞뒤 순서는 그대로입니다.
        List<String> added = covers.addCovers(FIRST, List.of(image));
        covers.removeCover(FIRST, photoId(added.get(1)));
        assertThat(profiles.findProfile(FIRST).orElseThrow().profileCoverUrls())
                .containsExactly(added.get(0), added.get(2));
        assertStatus(
                () -> covers.addCovers(FIRST, List.of(notImage)),
                HttpStatus.BAD_REQUEST,
                "JPG, PNG, WEBP 이미지 파일을 선택해 주세요.");
    }

    private static UUID photoId(String coverUrl) {
        return UUID.fromString(coverUrl.substring(coverUrl.lastIndexOf('/') + 1));
    }

    private static void insertProfile(UUID accountId, String nickname) {
        jdbc.update(INSERT_PROFILE, accountId, nickname);
    }

    private static String tagName(TasteTagGroup group) {
        return tagNames(group, 1).get(0);
    }

    private static List<String> tagNames(TasteTagGroup group, int count) {
        return jdbc.queryForList(
                "SELECT tag_name FROM taste_tags WHERE tag_group = ? ORDER BY sort_order LIMIT ?",
                String.class,
                group.name(),
                count);
    }

    private static UpdateProfileRequest request(
            String nickname, FoodFocus focus, List<String> profileTags, List<String> liked, List<String> excluded) {
        return new UpdateProfileRequest(
                nickname, null, focus, focus, ActivityScope.LOCAL, "마포", profileTags, liked, excluded);
    }

    static void assertStatus(ThrowingCallable call, HttpStatus status, String detail) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
            assertThat(exception.getStatusCode()).isEqualTo(status);
            assertThat(exception.getReason()).isEqualTo(detail);
        });
    }
}
