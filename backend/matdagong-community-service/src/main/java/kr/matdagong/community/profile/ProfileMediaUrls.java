package kr.matdagong.community.profile;

import java.util.UUID;

/** 프로필 응답과 구독 응답이 같은 이미지 주소를 쓰도록 ProfileMediaController 경로를 한곳에서 만듭니다. */
public final class ProfileMediaUrls {
    private ProfileMediaUrls() {}

    public static String avatar(UUID accountId) {
        return "/media/profiles/%s/avatar".formatted(accountId);
    }

    public static String coverPhoto(UUID accountId, UUID photoId) {
        return "/media/profiles/%s/covers/%s".formatted(accountId, photoId);
    }
}
