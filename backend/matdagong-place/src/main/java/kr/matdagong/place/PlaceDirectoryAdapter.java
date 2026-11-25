package kr.matdagong.place;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import kr.matdagong.common.module.PlaceDirectory;
import kr.matdagong.place.catalog.PlaceModels.RecordVisibility;
import kr.matdagong.place.catalog.PlaceQueryService;
import kr.matdagong.place.trust.TasteTrustService;
import org.springframework.stereotype.Component;

/** 커뮤니티 모듈이 묻는 기록 정보(PlaceDirectory)를 장소 모듈 서비스로 답합니다. */
@Component
class PlaceDirectoryAdapter implements PlaceDirectory {
    private final PlaceQueryService places;
    private final TasteTrustService trust;

    PlaceDirectoryAdapter(PlaceQueryService places, TasteTrustService trust) {
        this.places = places;
        this.trust = trust;
    }

    /** 장소 상세와 같은 조회(PlaceQueryService)로 그 계정이 남긴 기록을 찾고, 공개 여부는 저장된 값을 씁니다. */
    @Override
    public Optional<RecordedPlace> ownRecord(UUID accountId, String placeId) {
        String ownerId = accountId.toString();
        return places.findById(placeId, accountId).flatMap(place -> place.tasters().stream()
                .filter(taster -> ownerId.equals(taster.tasterId()))
                .findFirst()
                .map(taster ->
                        new RecordedPlace(place.id(), place.name(), taster.visibility() == RecordVisibility.PUBLIC)));
    }

    @Override
    public Map<UUID, TrustStats> trustStats(UUID accountId) {
        return trust.statsFor(accountId).stream().collect(Collectors.toMap(TrustStats::accountId, Function.identity()));
    }
}
