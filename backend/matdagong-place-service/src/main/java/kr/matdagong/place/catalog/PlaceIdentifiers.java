package kr.matdagong.place.catalog;

import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * 장소 ID와 지도 제공자 코드의 형식 규칙입니다.
 * 장소 ID는 DB 장소의 UUID 또는 샘플 장소의 "p-..." 문자열이라, 하트·최근 본 장소에는 문자열로 저장합니다.
 */
public final class PlaceIdentifiers {
    /** 하트·최근 본 장소에 저장하는 장소 ID의 최대 길이입니다. */
    public static final int MAX_PLACE_ID_LENGTH = 100;
    /** 지도 제공자 코드를 보내지 않은 요청의 기본값입니다. 현재 화면은 카카오 장소만 고릅니다. */
    public static final String DEFAULT_PROVIDER = "KAKAO";

    private PlaceIdentifiers() {}

    public static boolean isValidPlaceId(String placeId) {
        return placeId != null && !placeId.isBlank() && placeId.length() <= MAX_PLACE_ID_LENGTH;
    }

    /** DB 장소 ID(UUID)면 UUID를, 샘플 장소 ID처럼 UUID가 아니면 null을 반환합니다. */
    public static UUID uuidOrNull(String value) {
        try {
            return value == null ? null : UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    /** 제공자별 ID namespace를 분리해 지도 제공자를 바꿔도 장소 중복을 섞지 않습니다. 비어 있으면 KAKAO입니다. */
    public static String providerCode(String value) {
        String normalized = value == null || value.isBlank()
                ? DEFAULT_PROVIDER
                : value.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z0-9_]{2,20}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지도 정보 제공자를 확인해 주세요.");
        }
        return normalized;
    }
}
