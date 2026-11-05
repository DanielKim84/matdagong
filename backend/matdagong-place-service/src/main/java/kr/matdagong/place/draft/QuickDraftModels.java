package kr.matdagong.place.draft;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import kr.matdagong.place.kakao.KakaoPlaceVerifier;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import kr.matdagong.place.location.DeviceLocation;
import kr.matdagong.place.location.NearbyPlaceGuard;

/** 빠른 기록(나중에 기록을 쓰려고 담아 둔 장소) API의 요청·응답 자료형입니다. */
public final class QuickDraftModels {
    private static final String INVALID_COORDINATE = "장소 좌표를 확인해 주세요.";

    private QuickDraftModels() {}

    /**
     * 장소 검색 결과에서 맛집 작성에 필요한 기본 정보를 보관합니다. 빠른 저장은 다녀온 근거가 되므로 기기 위치
     * (deviceLocation)가 가게 1km 안일 때만 저장합니다.
     */
    public record QuickPlaceDraftRequest(
            @Size(max = 20) String providerCode,
            @NotBlank @Size(max = 80) String providerPlaceId,
            @NotBlank @Size(max = 120) String placeName,
            @Size(max = 200) String category,
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
            @Size(max = 300) String lotAddress,
            @NotNull(message = NearbyPlaceGuard.LOCATION_REQUIRED) @Valid DeviceLocation deviceLocation) {
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

    /** 로그인 사용자가 저장한 임시 장소의 검색 결과와 저장 시각입니다. */
    public record QuickPlaceDraftView(
            String providerCode,
            String providerPlaceId,
            String placeName,
            String category,
            String address,
            double latitude,
            double longitude,
            String providerPhone,
            String providerUrl,
            String roadAddress,
            String lotAddress,
            OffsetDateTime savedAt) {}

    /** 장소를 빠른 기록에 담기 전에 내 기록·빠른 기록과 겹치는지 알려줍니다. alreadyRegistered는 내가 이미 기록한 장소입니다. */
    public record QuickPlaceDuplicateView(boolean alreadyRegistered, boolean alreadySaved, String placeName) {}
}
