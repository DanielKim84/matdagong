package kr.matdagong.community.notification;

import static kr.matdagong.community.notification.NotificationModels.*;

import jakarta.validation.Valid;
import java.util.UUID;
import kr.matdagong.community.security.AuthenticatedAccount;
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

/** 로그인한 사용자의 저장된 알림과 읽음·삭제 동작을 제공합니다. */
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;
    private final PlaceServiceClient places;

    public NotificationController(NotificationService service, PlaceServiceClient places) {
        this.service = service;
        this.places = places;
    }

    @GetMapping
    public NotificationFeed list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(AuthenticatedAccount.id(jwt));
    }

    /** 화면은 장소 ID만 보내고, 알림 내용과 공개 여부는 장소 서비스에 저장된 본인 기록에서 정합니다. */
    @PostMapping("/place-recorded")
    @ResponseStatus(HttpStatus.CREATED)
    public NotificationView placeRegistered(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PlaceRegisteredRequest request) {
        UUID accountId = AuthenticatedAccount.id(jwt);
        // 실제로 저장된 본인 기록만 알림으로 만들고, 장소 서비스 조회는 DB 트랜잭션 밖에서 끝냅니다.
        PlaceServiceClient.RecordedPlace place = places.findOwnRecord(jwt.getTokenValue(), request.placeId(), accountId);
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
