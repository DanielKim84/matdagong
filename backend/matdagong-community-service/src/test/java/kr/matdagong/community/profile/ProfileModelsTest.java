package kr.matdagong.community.profile;

import static kr.matdagong.community.profile.ProfileModels.*;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import kr.matdagong.common.tag.TasteTagGroup;
import org.junit.jupiter.api.Test;

/** 분야별로 고를 수 있는 분류와 프로필 수정 요청의 값 정리를 확인합니다. */
class ProfileModelsTest {
    @Test
    void 분야마다_고를_수_있는_분류가_정해져_있고_매장_이용은_어디에도_없다() {
        assertThat(FoodFocus.RESTAURANT.allowedGroups())
                .containsExactlyInAnyOrder(
                        TasteTagGroup.CUISINE,
                        TasteTagGroup.TASTE,
                        TasteTagGroup.TRAVEL,
                        TasteTagGroup.MOOD,
                        TasteTagGroup.OCCASION);
        assertThat(FoodFocus.CAFE_DESSERT.allowedGroups())
                .containsExactlyInAnyOrder(
                        TasteTagGroup.CAFE,
                        TasteTagGroup.DESSERT,
                        TasteTagGroup.TRAVEL,
                        TasteTagGroup.MOOD,
                        TasteTagGroup.OCCASION);
        assertThat(FoodFocus.BOTH.allowedGroups()).isEqualTo(EnumSet.complementOf(EnumSet.of(TasteTagGroup.VISIT)));
    }

    @Test
    void 태그_목록_길이_한도는_매장_이용을_뺀_분류별_한도의_합이다() {
        int sum = Arrays.stream(TasteTagGroup.values())
                .filter(group -> group != TasteTagGroup.VISIT)
                .mapToInt(TasteTagGroup::maxSelections)
                .sum();

        assertThat(MAX_NON_VISIT_TAGS).isEqualTo(sum);
    }

    @Test
    void 수정_요청은_닉네임과_활동_지역의_공백을_정리하고_공백뿐인_소개는_비운다() {
        UpdateProfileRequest request = new UpdateProfileRequest(
                " 국밥러 ",
                "  ",
                FoodFocus.BOTH,
                FoodFocus.BOTH,
                ActivityScope.LOCAL,
                " 서울 마포구 ",
                List.of(),
                List.of(),
                List.of());

        assertThat(request.nickname()).isEqualTo("국밥러");
        assertThat(request.intro()).isNull();
        assertThat(request.activityRegion()).isEqualTo("서울 마포구");
    }
}
