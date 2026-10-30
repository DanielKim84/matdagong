package kr.matdagong.place.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

/**
 * Kakao에서 고른 한 장소에 사용자가 작성한 추천 내용을 저장합니다.
 * 작성자 이름·캐릭터는 받지 않고 커뮤니티 프로필에서, 가게 기본정보는 가능하면 카카오 Local API에서 다시 확인합니다.
 */
public record CreatePlaceRecordRequest(
        @Size(max = 20) String providerCode,
        @NotBlank @Size(max = 80) String providerPlaceId,
        @NotBlank @Size(max = 120) String placeName,
        @NotBlank @Size(max = 120) String category,
        @NotBlank @Size(max = 300) String address,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @Size(max = 40) String providerPhone,
        @Size(max = 500) String providerUrl,
        @Size(max = 300) String roadAddress,
        @Size(max = 300) String lotAddress,
        @NotBlank @Size(min = 5, max = 500) String reason,
        @NotBlank String visibility,
        @Valid @Size(max = 5) List<MenuInput> menus,
        // 태그와 방문 조건은 DB 칼럼(VARCHAR(40)) 길이에 맞춥니다. 빈 값은 서비스에서 건너뜁니다.
        @Size(max = 30) List<@Size(max = 40) String> tags,
        @Size(max = 30) Map<@Size(max = 40) String, @Size(max = 20) String> tagGroups,
        @Size(max = 12) List<@Size(max = 40) String> visitConditions,
        // 새 사진은 base64 data URL로, 수정할 때 유지할 사진은 조회 응답의 /media 주소(서명 포함)를 그대로 보냅니다. 메뉴 사진도 같습니다.
        @NotEmpty @Size(max = 10) List<@NotBlank @Size(max = MAX_PHOTO_CHARS) String> photos
) {
    /** 5MB 사진의 base64 data URL 길이에 여유를 둔 값입니다. 실제 바이트 수는 서비스에서 디코딩 후 다시 확인합니다. */
    public static final int MAX_PHOTO_CHARS = 7_000_000;

    public record MenuInput(
            @NotBlank @Size(max = 60) String name,
            @Min(0) @Max(10_000_000) Integer price,
            @Size(max = MAX_PHOTO_CHARS) String photo) {}
}
