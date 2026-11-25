package kr.matdagong.place.location;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/**
 * 요청을 보낸 기기의 현재 위치입니다. 다녀왔다는 근거(빠른 저장·새 맛집 기록)를 남기거나 방문 근거 없이 '별로였어요'를 고를 때
 * 가게와의 거리를 서버에서도 확인하려고 받습니다. 기기가 보내는 값이라 위치 조작까지 막지는 못하지만, 화면을 거치지 않은
 * 요청은 걸러 냅니다.
 */
public record DeviceLocation(
        @NotNull(message = DeviceLocation.INVALID_LOCATION)
                @DecimalMin(value = "-90", message = DeviceLocation.INVALID_LOCATION)
                @DecimalMax(value = "90", message = DeviceLocation.INVALID_LOCATION)
                Double latitude,
        @NotNull(message = DeviceLocation.INVALID_LOCATION)
                @DecimalMin(value = "-180", message = DeviceLocation.INVALID_LOCATION)
                @DecimalMax(value = "180", message = DeviceLocation.INVALID_LOCATION)
                Double longitude) {
    public static final String INVALID_LOCATION = "현재 위치를 확인해 주세요.";
}
