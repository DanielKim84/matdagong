package kr.matdagong.community.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import kr.matdagong.common.tag.TasteTagGroup;

/** 내 프로필 API의 요청·응답 자료형과 프로필 설정 값 목록입니다. */
public final class ProfileModels {
    /** 소개를 쓰지 않은 맛객에게 보여 주는 기본 소개 문구입니다. 새 프로필의 intro와 맛객 목록의 note에 씁니다. */
    public static final String DEFAULT_INTRO = "맛있는 장소를 찾아 기록하고 있어요.";

    private ProfileModels() {}

    /** 맛객의 관심 분야입니다. DB의 taster_focus·preference_focus 값과 같습니다. */
    public enum FoodFocus {
        RESTAURANT,
        CAFE_DESSERT,
        BOTH;

        /** 이 분야에서 고를 수 있는 메뉴 태그 그룹입니다. 상황(OCCASION) 태그는 어느 분야에서나 고릅니다. */
        Set<TasteTagGroup> allowedGroups() {
            return switch (this) {
                case RESTAURANT -> EnumSet.of(TasteTagGroup.CUISINE, TasteTagGroup.TASTE, TasteTagGroup.OCCASION);
                case CAFE_DESSERT -> EnumSet.of(TasteTagGroup.CAFE, TasteTagGroup.OCCASION);
                case BOTH -> EnumSet.of(
                        TasteTagGroup.CUISINE, TasteTagGroup.TASTE, TasteTagGroup.CAFE, TasteTagGroup.OCCASION);
            };
        }
    }

    /** 주 활동 방식입니다. TRAVEL(여행 위주)이면 활동 지역을 저장하지 않습니다. */
    public enum ActivityScope {
        LOCAL,
        TRAVEL,
        BOTH
    }

    /** user_preference_tags.preference_type 값입니다. LIKE는 추천에 반영하고 AVOID는 추천에서 뺍니다. */
    enum PreferenceType {
        LIKE,
        AVOID
    }

    public record EnsureProfileRequest(
            @NotBlank(message = "맛객 닉네임을 입력해 주세요.") @Size(max = 12, message = "닉네임은 12자 이하로 입력해 주세요.")
                    String nickname) {}

    /** 관심 분야를 비우면 BOTH, 활동 방식을 비우면 LOCAL로 저장합니다. */
    public record UpdateProfileRequest(
            @NotBlank(message = "맛객 닉네임을 입력해 주세요.") @Size(max = 12, message = "닉네임은 12자 이하로 입력해 주세요.") String nickname,
            @Size(max = 300, message = "소개는 300자 이하로 입력해 주세요.") String intro,
            FoodFocus tasterFocus,
            FoodFocus preferenceFocus,
            ActivityScope activityScope,
            @Size(max = 50, message = "활동 지역은 50자 이하로 입력해 주세요.") String activityRegion,
            @Size(max = 30) List<@NotBlank @Size(max = 30) String> profileTags,
            @Size(max = 30) List<@NotBlank @Size(max = 30) String> preferenceTags,
            @Size(max = 5, message = "제외할 방문 조건은 최대 5개까지 선택할 수 있어요.")
                    List<@NotBlank @Size(max = 30) String> excludedTags) {}

    /**
     * 내 프로필 응답입니다.
     *
     * @param profileCoverUrl 단일 배경 주소를 읽는 화면을 위한 대표 배경(갤러리의 첫 사진)입니다.
     */
    public record ProfileView(
            UUID accountId,
            String nickname,
            String profileImgUrl,
            int avatarVariant,
            String profileCoverUrl,
            List<String> profileCoverUrls,
            FoodFocus tasterFocus,
            FoodFocus preferenceFocus,
            ActivityScope activityScope,
            String activityRegion,
            String intro,
            List<String> profileTags,
            List<String> preferenceTags,
            List<String> excludedTags) {}

    /** 검증을 마친 이미지 파일 데이터와 MIME 형식입니다. */
    public record ProfileImage(byte[] data, String mimeType) {}
}
