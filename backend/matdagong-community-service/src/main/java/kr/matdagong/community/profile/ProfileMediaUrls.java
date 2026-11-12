package kr.matdagong.community.profile;

import java.util.List;
import java.util.UUID;

/**
 * 프로필 응답과 맛객·구독 응답이 같은 이미지 주소를 쓰도록 ProfileMediaController 경로를 한곳에서 만듭니다. 화면도 사진을
 * 저장한 직후 주소를 직접 맞추고(services/community.ts saveMyProfile) 배경 사진 ID를 주소에서 읽으므로(profileImages.ts)
 * 형식을 바꿀 때 함께 고칩니다.
 */
public final class ProfileMediaUrls {
    private ProfileMediaUrls() {}

    public static String avatar(UUID accountId) {
        return "/media/profiles/%s/avatar".formatted(accountId);
    }

    public static String coverPhoto(UUID accountId, UUID photoId) {
        return "/media/profiles/%s/covers/%s".formatted(accountId, photoId);
    }

    /** 배경 사진 ID 목록(sort_no 순)을 같은 순서의 주소 목록으로 바꿉니다. */
    public static List<String> coverPhotos(UUID accountId, List<UUID> photoIds) {
        return photoIds.stream().map(photoId -> coverPhoto(accountId, photoId)).toList();
    }
}
