package kr.matdagong.place.wish;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static kr.matdagong.place.wish.WishModels.*;

import java.util.UUID;
import kr.matdagong.place.catalog.PlaceQueryService;
import kr.matdagong.place.catalog.PlaceUpserts;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 맛객 기록이 없는 가게도 지역과 관계없이 가볼 곳('가 보고 싶어요' 하트)으로 저장합니다. 방문 확인이 필요 없습니다.
 * 기록이 없는 가게는 저장한 사람의 지도에만 보이고(PlaceQueryService), 다른 사람에게는 보이지 않습니다.
 */
@Service
public class WishService {
    private final JdbcTemplate jdbc;
    private final PlaceQueryService places;

    public WishService(JdbcTemplate jdbc, PlaceQueryService places) {
        this.jdbc = jdbc;
        this.places = places;
    }

    /**
     * 가게를 저장하고 가볼 곳으로 하트합니다. 이미 하트한 곳(다녀왔어요 포함)은 그대로 두고, 내 기록이 있는 곳은 이미 가 본 곳이라
     * 하트하지 않습니다. 어느 경우든 저장된 가게를 돌려줍니다.
     */
    @Transactional
    public PlaceView save(UUID accountId, PlaceInfo placeInfo, WishPlaceRequest request) {
        UUID placeId = PlaceUpserts.upsert(
                jdbc, request.providerCode(), request.providerPlaceId(), request.category(), placeInfo);
        jdbc.update(
                """
                INSERT INTO user_place_likes (account_id, place_id, save_origin)
                SELECT ?, ?, 'LIKED'
                WHERE NOT EXISTS (SELECT 1 FROM restaurant_records WHERE account_id = ? AND place_id = ?)
                ON CONFLICT (account_id, place_id) DO NOTHING
                """,
                accountId,
                placeId.toString(),
                accountId,
                placeId);
        return places.findById(placeId.toString(), accountId).orElseThrow();
    }
}
