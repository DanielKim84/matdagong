package kr.matdagong.place.recent;

import jakarta.validation.constraints.NotBlank;

/** 최근 본 장소 API의 요청 자료형입니다. */
public final class RecentPlaceModels {
    private RecentPlaceModels() {}

    public record RecentPlaceRequest(@NotBlank String placeId) {}
}
