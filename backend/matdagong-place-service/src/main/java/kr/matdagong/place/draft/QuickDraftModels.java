package kr.matdagong.place.draft;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

/** 빠른 기록(나중에 기록을 쓰려고 담아 둔 장소) API의 요청·응답 자료형입니다. */
public final class QuickDraftModels {
    private QuickDraftModels() {}

    /** 장소 검색 결과에서 맛집 작성에 필요한 기본 정보를 보관합니다. */
    public record QuickPlaceDraftRequest(
            @Size(max = 20) String providerCode,
            @NotBlank @Size(max = 80) String providerPlaceId,
            @NotBlank @Size(max = 120) String placeName,
            @Size(max = 200) String category,
            @NotBlank @Size(max = 300) String address,
            @NotNull
                    @DecimalMin(value = "-90", message = "장소 좌표를 확인해 주세요.")
                    @DecimalMax(value = "90", message = "장소 좌표를 확인해 주세요.")
                    Double latitude,
            @NotNull
                    @DecimalMin(value = "-180", message = "장소 좌표를 확인해 주세요.")
                    @DecimalMax(value = "180", message = "장소 좌표를 확인해 주세요.")
                    Double longitude,
            @Size(max = 40) String providerPhone,
            @Size(max = 500) String providerUrl,
            @Size(max = 300) String roadAddress,
            @Size(max = 300) String lotAddress) {}

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

    /** 장소를 빠른 기록에 담기 전에 기존 맛집 기록과 겹치는지 알려줍니다. */
    public record QuickPlaceDuplicateView(boolean alreadyRegistered, boolean alreadySaved, String placeName) {}
}
