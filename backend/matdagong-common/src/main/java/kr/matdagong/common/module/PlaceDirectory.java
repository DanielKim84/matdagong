package kr.matdagong.common.module;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * 커뮤니티 모듈이 장소 모듈에 묻는 기록 정보입니다. 장소 모듈이 구현하고(PlaceDirectoryAdapter), 커뮤니티 모듈은 이
 * 인터페이스만 압니다. 한 서버(matdagong-api) 안에서 함수 호출로 이어집니다.
 */
public interface PlaceDirectory {
    /** 그 계정이 그 장소에 남긴 기록입니다. 장소나 본인 기록이 없으면 비어 있습니다(맛집 등록 알림 확인에 씀). */
    Optional<RecordedPlace> ownRecord(UUID accountId, String placeId);

    /** 그 계정과 다른 계정 사이 경험 신뢰 재료를 다른 계정 ID별로 돌려줍니다(맛객 신뢰 % 계산에 씀). */
    Map<UUID, TrustStats> trustStats(UUID accountId);

    /** 장소 모듈이 저장한 본인 기록입니다. publicRecord가 true일 때만 구독자에게 알립니다. */
    record RecordedPlace(String placeId, String placeName, boolean publicRecord) {}

    /**
     * 나와 다른 계정 한 명이 같은 맛집을 두고 남긴 경험입니다. 어느 쪽에서 물어도 같은 값이고, 장소 목록은 담지 않아 상대가
     * 나만 보기로 남긴 곳이 어디인지는 드러나지 않습니다.
     *
     * @param agreedCount 둘 다 인정한(기록한) 맛집 수
     * @param conflictCount 한쪽은 인정하고 다른 쪽은 별로였던 곳으로 남긴 맛집 수
     * @param tagMatchPercent 둘 다 기록한 맛집에서 고른 태그·매장 정보가 겹친 정도의 평균(0~100). 비교할 기록이 없으면 null
     */
    record TrustStats(UUID accountId, int agreedCount, int conflictCount, Integer tagMatchPercent) {}
}
