package kr.matdagong.place.api;

import java.util.concurrent.TimeUnit;
import kr.matdagong.place.application.PlaceRecordService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** 사진 응답의 캐시 정책을 한곳에서 정합니다. */
final class MediaResponses {
    private MediaResponses() {}

    /**
     * 공개 사진은 공유 캐시에 5분까지 둘 수 있습니다. 서명 주소로 연 비공개 사진은 브라우저에만 두고,
     * 서명이 만료되기 전까지만(최대 1시간) 캐시해 공개 범위를 바꾼 뒤에도 공유 캐시에 남지 않게 합니다.
     */
    static ResponseEntity<byte[]> photo(PlaceRecordService.Photo photo, long signedSeconds) {
        CacheControl cache = signedSeconds > 0
                ? CacheControl.maxAge(Math.min(signedSeconds, 3600), TimeUnit.SECONDS).cachePrivate()
                : CacheControl.maxAge(5, TimeUnit.MINUTES).cachePublic();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(photo.mimeType()))
                .cacheControl(cache).body(photo.bytes());
    }
}
