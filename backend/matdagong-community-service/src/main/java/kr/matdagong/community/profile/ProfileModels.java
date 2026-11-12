package kr.matdagong.community.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.common.text.Texts;

/** 내 프로필 API의 요청·응답 자료형과 프로필 설정 값 목록입니다. */
public final class ProfileModels {
    /** 소개를 쓰지 않은 맛객에게 보여 주는 기본 소개 문구입니다. 새 프로필의 intro에 씁니다. */
    public static final String DEFAULT_INTRO = "맛있는 장소를 찾아 기록하고 있어요.";

    /**
     * 닉네임 최대 글자 수입니다. 화면 models/community.ts의 MAX_NICKNAME_LENGTH와 맞춥니다. 처음 만들 때 겹쳐서 붙이는
     * 접미사도 이 안에 들어가게 자르고(NicknameCandidates), 미리 확인(isNicknameAvailable)도 이 한도를 넘으면 쓸 수 없다고
     * 답합니다. DB 칼럼(VARCHAR(30))은 저장 상한일 뿐입니다.
     */
    static final int MAX_NICKNAME_LENGTH = 12;

    private static final String NICKNAME_REQUIRED = "맛객 닉네임을 입력해 주세요.";
    private static final String NICKNAME_TOO_LONG = "닉네임은 " + MAX_NICKNAME_LENGTH + "자 이하로 입력해 주세요.";
    private static final String FOCUS_REQUIRED = "관심 분야를 선택해 주세요.";
    /** VISIT을 뺀 분류별 한도의 합(10+5+5+10+5+10+5)입니다. 애너테이션 값이라 상수로 둡니다. */
    static final int MAX_NON_VISIT_TAGS = 50;

    private ProfileModels() {}

    /** 맛객의 관심 분야입니다. DB의 taster_focus·preference_focus 값과 같습니다. */
    public enum FoodFocus {
        RESTAURANT,
        CAFE_DESSERT,
        BOTH;

        /**
         * 이 분야에서 고를 수 있는 태그 분류입니다. 여행·뷰·이럴 때(TRAVEL·MOOD·OCCASION)는 어느 분야에서나 고르고,
         * 매장 이용(VISIT)은 피하고 싶은 조건에만 씁니다. 화면 기록하기의 FoodKind도 같은 묶음을 씁니다.
         */
        public Set<TasteTagGroup> allowedGroups() {
            return switch (this) {
                case RESTAURANT -> EnumSet.of(
                        TasteTagGroup.CUISINE,
                        TasteTagGroup.TASTE,
                        TasteTagGroup.TRAVEL,
                        TasteTagGroup.MOOD,
                        TasteTagGroup.OCCASION);
                case CAFE_DESSERT -> EnumSet.of(
                        TasteTagGroup.CAFE,
                        TasteTagGroup.DESSERT,
                        TasteTagGroup.TRAVEL,
                        TasteTagGroup.MOOD,
                        TasteTagGroup.OCCASION);
                case BOTH -> EnumSet.complementOf(EnumSet.of(TasteTagGroup.VISIT));
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

    /** 닉네임 미리 확인 응답입니다. 화면 services/community.ts checkNicknameAvailable과 맞춥니다. */
    public record NicknameAvailability(boolean available) {}

    public record EnsureProfileRequest(
            @NotBlank(message = NICKNAME_REQUIRED) @Size(max = MAX_NICKNAME_LENGTH, message = NICKNAME_TOO_LONG)
                    String nickname) {}

    /**
     * 프로필 수정 요청입니다. 화면은 분야·활동 방식을 늘 보냅니다. 닉네임·소개·활동 지역의 앞뒤 공백은 검증 전에
     * 지웁니다(소개·활동 지역이 공백뿐이면 비움). 소개 300자는 화면 useProfileForm의 MAX_INTRO_LENGTH와 맞춥니다. 태그 목록
     * 길이는 형식만 막고, 분류별 한도(TasteTagGroup.maxSelections)와 사전에 있는 태그인지는 UserProfileService가
     * 확인합니다.
     */
    public record UpdateProfileRequest(
            @NotBlank(message = NICKNAME_REQUIRED) @Size(max = MAX_NICKNAME_LENGTH, message = NICKNAME_TOO_LONG)
                    String nickname,
            @Size(max = 300, message = "소개는 300자 이하로 입력해 주세요.") String intro,
            @NotNull(message = FOCUS_REQUIRED) FoodFocus tasterFocus,
            @NotNull(message = FOCUS_REQUIRED) FoodFocus preferenceFocus,
            @NotNull(message = "활동 방식을 선택해 주세요.") ActivityScope activityScope,
            @Size(max = 50, message = "활동 지역은 50자 이하로 입력해 주세요.") String activityRegion,
            @Size(max = MAX_NON_VISIT_TAGS) List<@NotBlank @Size(max = 30) String> profileTags,
            @Size(max = MAX_NON_VISIT_TAGS) List<@NotBlank @Size(max = 30) String> preferenceTags,
            @Size(max = 5, message = "피하고 싶은 조건은 최대 5개까지 선택할 수 있어요.")
                    List<@NotBlank @Size(max = 30) String> excludedTags) {
        public UpdateProfileRequest {
            nickname = nickname == null ? null : nickname.trim();
            intro = Texts.blankToNull(intro);

            activityRegion = Texts.blankToNull(activityRegion);
        }
    }

    /**
     * 내 프로필 응답입니다.
     *
     * @param hiddenByReports 신고가 쌓여 자동으로 가려졌으면 true. 화면은 안내를 띄우고, 장소 서비스는 새 기록을 막습니다.
     */
    public record ProfileView(
            UUID accountId,
            String nickname,
            String profileImgUrl,
            int avatarVariant,
            List<String> profileCoverUrls,
            FoodFocus tasterFocus,
            FoodFocus preferenceFocus,
            ActivityScope activityScope,
            String activityRegion,
            String intro,
            List<String> profileTags,
            List<String> preferenceTags,
            List<String> excludedTags,
            boolean hiddenByReports) {}

    /**
     * 소셜 프로필 사진 가져오기 요청입니다. 주소는 공통 로그인 가입 상태의 profileImageUrl(dagong-auth, 1000자까지)이고,
     * 화면 services/community.ts importSocialAvatar와 맞춥니다.
     */
    public record SocialAvatarRequest(@NotBlank @Size(max = 1000) String imageUrl) {}

    /** 검증을 마친 이미지 파일 데이터와 MIME 형식입니다. */
    public record ProfileImage(byte[] data, String mimeType) {}
}
