package kr.matdagong.place.record;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.catalog.PlaceModels.RecordVisibility;
import kr.matdagong.place.kakao.KakaoPlaceVerifier;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;

/** 맛집 기록 저장과 하트↔기록 전환 API의 요청 자료형입니다. */
public final class PlaceRecordModels {
    /** 5MB 사진의 base64 data URL 길이에 여유를 둔 값입니다. 실제 바이트 수는 디코딩 후 다시 확인합니다. */
    public static final int MAX_PHOTO_CHARS = 7_000_000;

    private static final String INVALID_COORDINATE = "장소 좌표를 확인해 주세요.";

    private PlaceRecordModels() {}

    /**
     * Kakao에서 고른 한 장소에 사용자가 작성한 추천 내용을 저장합니다.
     * 작성자 이름·캐릭터는 받지 않고 커뮤니티 프로필에서, 가게 기본정보는 가능하면 카카오 Local API에서 다시 확인합니다.
     *
     * @param tags 태그와 방문 조건은 DB 칼럼(VARCHAR(40)) 길이에 맞춥니다. 빈 값은 저장할 때 건너뜁니다.
     * @param photos 새 사진은 base64 data URL로, 수정할 때 유지할 사진은 조회 응답의 /media 주소(서명 포함)를 그대로
     *     보냅니다. 메뉴 사진도 같습니다.
     */
    public record CreatePlaceRecordRequest(
            @Size(max = 20) String providerCode,
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
            @Size(max = 300) String lotAddress,
            @NotBlank(message = "추천 이유를 입력해 주세요.") @Size(min = 5, max = 500, message = "추천 이유는 5자 이상 500자 이하로 입력해 주세요.")
                    String reason,
            @NotNull(message = "공개 범위를 확인해 주세요.") RecordVisibility visibility,
            @Valid @Size(max = 5, message = "메뉴는 최대 5개까지 등록할 수 있어요.") List<MenuInput> menus,
            @Size(max = 30) List<@Size(max = 40) String> tags,
            @Size(max = 30) Map<@Size(max = 40) String, @Size(max = 20) String> tagGroups,
            @Size(max = 12) List<@Size(max = 40) String> visitConditions,
            @NotEmpty(message = "사진을 한 장 이상 등록해 주세요.") @Size(max = 10, message = "사진은 최대 10장까지 등록할 수 있어요.")
                    List<@NotBlank @Size(max = MAX_PHOTO_CHARS) String> photos) {
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

    public record MenuInput(
            @NotBlank(message = "메뉴 이름을 입력해 주세요.") @Size(max = 60) String name,
            @Min(0) @Max(10_000_000) Integer price,
            @Size(max = MAX_PHOTO_CHARS) String photo) {}

    /** 여러 내 기록의 공개 범위를 한 번에 바꿀 때 보냅니다. */
    public record ChangeVisibilityRequest(
            @NotEmpty(message = "바꿀 기록을 골라 주세요.") @Size(max = 100, message = "한 번에 100곳까지 바꿀 수 있어요.")
                    List<@NotBlank @Size(max = PlaceIdentifiers.MAX_PLACE_ID_LENGTH) String> placeIds,
            @NotNull(message = "공개 범위를 확인해 주세요.") RecordVisibility visibility) {}

    /** changed는 실제로 바뀐 내 기록 수입니다. */
    public record ChangeVisibilityResponse(int changed) {}

    /** visitedConfirmed는 사용자가 직접 방문했다고 확인했는지입니다. 확인하지 않으면 기록으로 바꾸지 않습니다. */
    public record LikeToRecordRequest(
            @NotBlank(message = "전환할 내 맛집을 확인해 주세요.")
                    @Size(max = PlaceIdentifiers.MAX_PLACE_ID_LENGTH, message = "전환할 내 맛집을 확인해 주세요.")
                    String sourcePlaceId,
            @NotNull @Valid CreatePlaceRecordRequest record,
            boolean visitedConfirmed) {}
}
