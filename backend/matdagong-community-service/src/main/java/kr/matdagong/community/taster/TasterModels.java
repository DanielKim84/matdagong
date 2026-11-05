package kr.matdagong.community.taster;

import java.util.List;
import kr.matdagong.community.profile.ProfileModels.ActivityScope;
import kr.matdagong.community.profile.ProfileModels.FoodFocus;

/** 맛객 목록 API의 응답 자료형입니다. */
public final class TasterModels {
    private TasterModels() {}

    /**
     * 다른 맛객 한 명의 공개 프로필과 나와의 취향·신뢰 비교 결과입니다.
     *
     * @param profileCoverUrl 단일 배경 주소를 읽는 화면을 위한 대표 배경(갤러리의 첫 사진)입니다.
     * @param matchedTags 맛객의 프로필 태그 중 내 좋아요 태그와 겹치는 태그입니다.
     * @param matchScore 나와의 취향 일치율(0~100). 내 취향 태그 중 이 맛객의 프로필 태그와 겹치는 비율입니다.
     * @param trustScore 같은 맛집 경험으로 쌓인 신뢰 %(0~100). 함께 다녀온 맛집이 없으면 null이고 화면은 취향 %를 보여 줍니다.
     * @param trustLevel 신뢰 등급. trustScore가 null이면 null입니다.
     */
    public record TasterView(
            String tasterId,
            String tasterName,
            String tag,
            String avatar,
            int avatarVariant,
            String profileCoverUrl,
            List<String> profileCoverUrls,
            FoodFocus tasterFocus,
            ActivityScope activityScope,
            String activityRegion,
            String note,
            String intro,
            int subscriberCount,
            List<String> profileTags,
            List<String> matchedTags,
            int matchScore,
            Integer trustScore,
            TrustLevel trustLevel) {}

    /**
     * 신뢰 %에 붙는 등급입니다. 등급을 잘게 나누지 않고 '믿고 가는 맛객' 하나만 둡니다.
     * 함께 다녀온 맛집이 10곳 미만이면 퍼센트와 상관없이 LEARNING입니다.
     */
    public enum TrustLevel {
        /** 아직 알아 가는 중 */
        LEARNING,
        /** 10~79%: 따로 표시하지 않음 */
        NORMAL,
        /** 80% 이상: 믿고 가는 맛객 */
        TRUSTED,
        /** 10% 미만: 입맛이 다른 편 */
        DIFFERENT
    }
}
