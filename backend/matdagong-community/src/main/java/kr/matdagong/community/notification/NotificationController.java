package kr.matdagong.community.notification;

import static kr.matdagong.community.notification.NotificationModels.*;

import jakarta.validation.Valid;
import java.util.UUID;
import kr.matdagong.common.module.PlaceDirectory;
import kr.matdagong.common.module.PlaceDirectory.RecordedPlace;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 로그인한 사용자의 저장된 알림과 읽음·삭제 동작을 제공합니다. */
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private static final String RECORD_NOT_FOUND = "등록한 맛집 기록을 찾을 수 없습니다.";

    private final NotificationService service;
    private final PlaceDirectory places;

    public NotificationController(NotificationService service, PlaceDirectory places) {
        this.service = service;
        this.places = places;
    }

    @GetMapping("/settings")
    public NotificationSettings settings(@AuthenticationPrincipal Jwt jwt) {
        return service.settings(AuthenticatedAccount.id(jwt));
    }

    @PutMapping("/settings")
    public NotificationSettings updateSettings(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody NotificationSettings request) {
        return service.updateSettings(AuthenticatedAccount.id(jwt), request);
    }

    @GetMapping
    public NotificationFeed list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(AuthenticatedAccount.id(jwt));
    }

    /**
     * 화면은 장소 ID만 보내고, 알림 내용과 공개 여부는 장소 모듈에 실제로 저장된 본인 기록에서 정합니다(PlaceDirectory).
     * 장소 DB 조회는 커뮤니티 DB 트랜잭션에 들어가기 전에 여기서 끝냅니다.
     */
    @PostMapping("/place-recorded")
    @ResponseStatus(HttpStatus.CREATED)
    public NotificationView placeRegistered(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PlaceRegisteredRequest request) {
        UUID accountId = AuthenticatedAccount.id(jwt);
        RecordedPlace place = places.ownRecord(accountId, request.placeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, RECORD_NOT_FOUND));
        return service.placeRegistered(accountId, place);
    }

    @PutMapping("/{notificationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID notificationId) {
        service.markRead(AuthenticatedAccount.id(jwt), notificationId);
    }

    @PutMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(@AuthenticationPrincipal Jwt jwt) {
        service.markAllRead(AuthenticatedAccount.id(jwt));
    }

    @PutMapping("/read-passive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markPassiveRead(@AuthenticationPrincipal Jwt jwt) {
        service.markPassiveRead(AuthenticatedAccount.id(jwt));
    }

    @DeleteMapping("/{notificationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID notificationId) {
        service.delete(AuthenticatedAccount.id(jwt), notificationId);
    }

    @DeleteMapping("/all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAll(@AuthenticationPrincipal Jwt jwt) {
        service.deleteAll(AuthenticatedAccount.id(jwt));
    }
}
