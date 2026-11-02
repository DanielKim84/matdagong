package kr.matdagong.place.media;

import static kr.matdagong.place.media.MediaModels.*;

import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 기록 사진은 브라우저 img 태그에서 직접 읽을 수 있도록 제공합니다.
 * 공개 기록은 누구나, 비공개 기록은 작성자에게 발급한 서명 주소로만 열 수 있습니다.
 */
@RestController
@RequestMapping("/media/" + MediaUrlSigner.RECORD_PHOTO)
public class PlaceRecordPhotoController {
    private final PlacePhotoService photos;
    private final MediaUrlSigner signer;

    public PlaceRecordPhotoController(PlacePhotoService photos, MediaUrlSigner signer) {
        this.photos = photos;
        this.signer = signer;
    }

    @GetMapping("/{photoId}")
    public ResponseEntity<byte[]> photo(
            @PathVariable UUID photoId,
            @RequestParam(required = false) Long exp,
            @RequestParam(required = false) String sig) {
        long signedSeconds = signer.remainingSeconds(MediaUrlSigner.RECORD_PHOTO, photoId, exp, sig);
        Optional<Photo> photo = signedSeconds > 0 ? photos.findPhoto(photoId) : photos.findPublicPhoto(photoId);
        return photo.map(found -> MediaResponses.photo(found, signedSeconds))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다."));
    }
}
