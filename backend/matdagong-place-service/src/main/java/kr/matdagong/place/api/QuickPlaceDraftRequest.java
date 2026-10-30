package kr.matdagong.place.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 장소 검색 결과에서 맛집 작성에 필요한 기본 정보를 보관합니다. */
public record QuickPlaceDraftRequest(
        @Size(max = 20) String providerCode,
        @NotBlank @Size(max = 80) String providerPlaceId,
        @NotBlank @Size(max = 120) String placeName,
        @Size(max = 200) String category,
        @NotBlank @Size(max = 300) String address,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @Size(max = 40) String providerPhone,
        @Size(max = 500) String providerUrl,
        @Size(max = 300) String roadAddress,
        @Size(max = 300) String lotAddress) {}
