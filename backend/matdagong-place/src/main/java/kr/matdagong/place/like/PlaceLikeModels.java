package kr.matdagong.place.like;

import jakarta.validation.Valid;
import kr.matdagong.place.location.DeviceLocation;

/** 하트(가볼 곳)와 별로였던 곳 API의 요청 자료형입니다. */
public final class PlaceLikeModels {
    private PlaceLikeModels() {}

    /** 하트는 가볼 곳 한 가지라 방문 근거(기기 위치)를 받지 않습니다. */
    public record LikeRequest(boolean liked) {}

    /** @param deviceLocation 지금 기기 위치. 방문 근거가 없어도 가게 1km 안이면 별로였던 곳으로 남길 수 있습니다. */
    public record DislikeRequest(boolean disliked, @Valid DeviceLocation deviceLocation) {}
}
