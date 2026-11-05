package kr.matdagong.place.like;

/** 하트(내 맛집 저장)와 별로였던 곳 API의 요청 자료형입니다. */
public final class PlaceLikeModels {
    private PlaceLikeModels() {}

    /** 하트를 남긴 이유입니다. DB의 user_place_likes.save_origin 값과 같습니다. */
    public enum SaveOrigin {
        /** 가 보고 싶어요 */
        LIKED,
        /** 다녀왔는데 입맛에 맞았어요 */
        VISITED
    }

    /**
     * @param visited true면 '다녀왔는데 입맛에 맞았어요', false면 '가 보고 싶어요'로 저장합니다. 이전 화면이 보내지 않으면 false입니다.
     */
    public record LikeRequest(boolean liked, boolean visited) {}

    public record DislikeRequest(boolean disliked) {}
}
