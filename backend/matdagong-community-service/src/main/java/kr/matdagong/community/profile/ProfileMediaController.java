package kr.matdagong.community.profile;

import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 프로필 사진과 배경 사진을 브라우저 img 태그에서 직접 읽을 수 있게 제공합니다.
 * img 태그는 토큰을 보낼 수 없으므로 인증 없이 열리며, 주소 형식은 ProfileMediaUrls가 만듭니다.
 */
@RestController
@RequestMapping("/media/profiles")
public class ProfileMediaController {
    private final ProfileImageService images;

    public ProfileMediaController(ProfileImageService images) {
        this.images = images;
    }

    @GetMapping("/{accountId}/avatar")
    public ResponseEntity<byte[]> avatar(@PathVariable UUID accountId) {
        return image(images.findAvatar(accountId));
    }

    @GetMapping("/{accountId}/covers/{photoId}")
    public ResponseEntity<byte[]> coverPhoto(@PathVariable UUID accountId, @PathVariable UUID photoId) {
        ProfileImageService.ProfileImage image = images.findCoverPhoto(accountId, photoId);
        if (image == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return image(image);
    }

    private static ResponseEntity<byte[]> image(ProfileImageService.ProfileImage image) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.mimeType()))
                .cacheControl(CacheControl.noStore())
                .body(image.data());
    }
}
