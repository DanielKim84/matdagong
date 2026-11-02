package kr.matdagong.community.profile;

import java.util.List;
import java.util.UUID;

/** 프로필 응답과 맛객·구독 응답이 같은 이미지 주소를 쓰도록 ProfileMediaController 경로를 한곳에서 만듭니다. */
public final class ProfileMediaUrls {
    private ProfileMediaUrls() {}

    public static String avatar(UUID accountId) {
        return "/media/profiles/%s/avatar".formatted(accountId);
    }

    public static String coverPhoto(UUID accountId, UUID photoId) {
        return "/media/profiles/%s/covers/%s".formatted(accountId, photoId);
    }

    /** 단일 배경 주소(profileCoverUrl)를 읽는 화면과 호환되도록 갤러리의 첫 사진을 대표 배경으로 씁니다. */
    public static String representativeCover(List<String> coverUrls) {
        return coverUrls.isEmpty() ? null : coverUrls.get(0);
    }
}
