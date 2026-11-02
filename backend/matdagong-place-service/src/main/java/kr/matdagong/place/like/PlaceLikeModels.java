package kr.matdagong.place.like;

/** 하트(내 맛집 저장) API의 요청 자료형입니다. */
public final class PlaceLikeModels {
    private PlaceLikeModels() {}

    public record LikeRequest(boolean liked) {}
}
