package kr.matdagong.community.profile;

import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 프로필 사진 URL을 브라우저 img 태그에서 직접 읽을 수 있게 제공합니다. */
@RestController
@RequestMapping("/media/profiles")
public class ProfileMediaController {
    private final ProfileImageService images;

    public ProfileMediaController(ProfileImageService images) {
        this.images = images;
    }

    @GetMapping("/{accountId}/{kind}")
    public ResponseEntity<byte[]> image(
            @PathVariable UUID accountId,
            @PathVariable String kind) {
        ProfileImageService.ProfileImage image = images.find(accountId, ProfileImageService.Kind.fromPath(kind));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.mimeType()))
                .cacheControl(CacheControl.noStore())
                .body(image.data());
    }
}
