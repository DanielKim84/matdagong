package kr.matdagong.community.profile;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** 소셜 프로필 사진은 카카오·네이버 사진 서버의 https 주소만 내려받는지 확인합니다. */
class SocialAvatarDownloaderTest {

    @Test
    void 카카오_네이버_사진_서버의_https_주소만_받는다() {
        assertThat(SocialAvatarDownloader.allowedUri("https://k.kakaocdn.net/dn/a/img_640x640.jpg"))
                .isNotNull();
        assertThat(SocialAvatarDownloader.allowedUri("https://phinf.pstatic.net/contact/a.jpg"))
                .isNotNull();

        assertThat(SocialAvatarDownloader.allowedUri("http://k.kakaocdn.net/a.jpg"))
                .isNull();
        assertThat(SocialAvatarDownloader.allowedUri("https://evil.example/a.jpg"))
                .isNull();
        assertThat(SocialAvatarDownloader.allowedUri("https://kakaocdn.net.evil.example/a.jpg"))
                .isNull();
        assertThat(SocialAvatarDownloader.allowedUri("https://evilkakaocdn.net/a.jpg"))
                .isNull();
        assertThat(SocialAvatarDownloader.allowedUri("https://user@k.kakaocdn.net/a.jpg"))
                .isNull();
        assertThat(SocialAvatarDownloader.allowedUri("https://k.kakaocdn.net:8443/a.jpg"))
                .isNull();
        assertThat(SocialAvatarDownloader.allowedUri("not a url")).isNull();
        assertThat(SocialAvatarDownloader.allowedUri(null)).isNull();
    }
}
