package kr.matdagong.community.profile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** 로그인한 사용자의 태그 추가 요청을 접수하고 본인의 최근 요청만 제공합니다. */
@RestController
@RequestMapping("/api/v1/taste-tags/requests")
public class TasteTagRequestController {
    private final TasteTagRequestService service;

    public TasteTagRequestController(TasteTagRequestService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<TasteTagRequestService.RequestView> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TagRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(
                UUID.fromString(jwt.getSubject()), request.name(), request.tagGroup(), request.reason()));
    }

    @GetMapping("/mine")
    public List<TasteTagRequestService.RequestView> mine(@AuthenticationPrincipal Jwt jwt) {
        return service.mine(UUID.fromString(jwt.getSubject()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ProblemDetail requestError(ResponseStatusException exception) {
        return ProblemDetail.forStatusAndDetail(exception.getStatusCode(), exception.getReason());
    }

    public record TagRequest(
            @NotBlank @Size(max = 30) String name,
            @NotBlank @Pattern(regexp = "CUISINE|TASTE|CAFE|OCCASION|VISIT") String tagGroup,
            @Size(max = 300) String reason) {}
}
