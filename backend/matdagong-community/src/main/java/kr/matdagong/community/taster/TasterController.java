package kr.matdagong.community.taster;

import static kr.matdagong.community.taster.TasterModels.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import kr.matdagong.common.module.PlaceDirectory;
import kr.matdagong.common.module.PlaceDirectory.TrustStats;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 사용자에게 구독할 수 있는 다른 맛객 목록을 제공합니다. */
@RestController
@RequestMapping("/api/v1/tasters")
public class TasterController {
    private static final Logger log = LoggerFactory.getLogger(TasterController.class);

    private final TasterService tasters;
    private final PlaceDirectory places;

    public TasterController(TasterService tasters, PlaceDirectory places) {
        this.tasters = tasters;
        this.places = places;
    }

    /**
     * 장소 DB 조회가 커뮤니티 DB 트랜잭션을 붙잡지 않도록 경험 재료를 먼저 받은 뒤 목록을 만듭니다. 신뢰는 목록의 덧붙임이라
     * 장소 DB를 읽지 못하면 빈 값으로 두고 목록은 취향 %만으로 보여 줍니다.
     */
    @GetMapping
    public List<TasterView> tasters(@AuthenticationPrincipal Jwt jwt) {
        UUID accountId = AuthenticatedAccount.id(jwt);
        return tasters.tasters(accountId, trustStats(accountId));
    }

    private Map<UUID, TrustStats> trustStats(UUID accountId) {
        try {
            return places.trustStats(accountId);
        } catch (DataAccessException exception) {
            log.warn("맛객 신뢰 재료를 읽지 못해 취향 %만으로 보여 줍니다: {}", exception.getMessage());
            return Map.of();
        }
    }
}
