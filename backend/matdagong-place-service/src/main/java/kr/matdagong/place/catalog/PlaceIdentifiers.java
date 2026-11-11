package kr.matdagong.place.catalog;

import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * 장소 ID와 지도 제공자 코드의 형식 규칙입니다.
 * 장소 ID는 DB 장소(restaurant_places.place_id)의 UUID이고, 하트·다녀온 곳·최근 본 곳·제보도 같은 UUID로 가리킵니다.
 * 화면은 주소 경로와 JSON에서 문자열로 주고받으므로 요청 값은 여기서 UUID로 바꿉니다.
 */
public final class PlaceIdentifiers {
    /** 요청으로 받는 장소 ID 문자열의 최대 길이입니다. UUID는 36자라 넉넉하게 둔 입력 상한입니다. */
    public static final int MAX_PLACE_ID_LENGTH = 100;
    /** 지도 제공자 코드를 보내지 않은 요청의 기본값입니다. 현재 화면은 카카오 장소만 고릅니다. */
    public static final String DEFAULT_PROVIDER = "KAKAO";

    private PlaceIdentifiers() {}

    /** 장소 ID(UUID 문자열)면 UUID를, UUID 형식이 아니면(있을 수 없는 장소) null을 반환합니다. */
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
