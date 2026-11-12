package kr.matdagong.place.wish;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kr.matdagong.place.kakao.KakaoPlaceVerifier;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;

/** 가볼 곳 저장 API의 요청 자료형입니다. */
public final class WishModels {
    private static final String INVALID_COORDINATE = "장소 위치를 확인해 주세요.";

    private WishModels() {}

    /** 카카오 장소 검색에서 고른 가게입니다. 서버가 카카오에서 다시 확인한 값으로 저장합니다. */
    public record WishPlaceRequest(
            @NotBlank @Size(max = 20) String providerCode,
            @NotBlank @Size(max = 80) String providerPlaceId,
            @NotBlank @Size(max = 120) String placeName,
            @NotBlank @Size(max = 120) String category,
            @NotBlank @Size(max = 300) String address,
            @NotNull
                    @DecimalMin(value = "-90", message = INVALID_COORDINATE)
                    @DecimalMax(value = "90", message = INVALID_COORDINATE)
                    Double latitude,
            @NotNull
                    @DecimalMin(value = "-180", message = INVALID_COORDINATE)
                    @DecimalMax(value = "180", message = INVALID_COORDINATE)
                    Double longitude,
            @Size(max = 40) String providerPhone,
            @Size(max = 500) String providerUrl,
            @Size(max = 300) String roadAddress,
            @Size(max = 300) String lotAddress) {
        /** 카카오 확인 전, 요청 본문에 담겨 온 가게 기본정보입니다. 상세 주소는 카카오 장소 페이지 형식만 남깁니다. */
        public PlaceInfo submittedPlace() {
            return new PlaceInfo(
                    placeName,
                    address,
                    latitude,
                    longitude,
                    providerPhone,
                    KakaoPlaceVerifier.safeUrl(providerUrl),
                    roadAddress,
                    lotAddress,
                    false);
        }
    }
}
