package kr.matdagong.community.profile;

import static kr.matdagong.community.profile.ProfileModels.*;

import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** 로그인한 계정의 맛다공 프로필, 취향 설정과 이미지 변경 요청을 처리합니다. */
@RestController
@RequestMapping("/api/v1/users/me/profile")
public class UserProfileController {
    private final UserProfileService profiles;
    private final ProfileImageService images;
    private final ProfileCoverService covers;
    private final SocialAvatarDownloader socialAvatars;

    public UserProfileController(
            UserProfileService profiles,
            ProfileImageService images,
            ProfileCoverService covers,
            SocialAvatarDownloader socialAvatars) {
        this.profiles = profiles;
        this.images = images;
        this.covers = covers;
        this.socialAvatars = socialAvatars;
    }

    @PostMapping
    public ProfileView ensureProfile(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody EnsureProfileRequest request) {
        return profiles.ensureProfile(AuthenticatedAccount.id(jwt), request.nickname());
    }

    /**
     * 닉네임을 쓸 수 있는지 미리 알려 줍니다. 가입 1단계(SignupNameStep)와 프로필 편집이 입력하는 동안 묻고, 저장할 때는
     * 저장 요청이 한 번 더 확인합니다(그 사이 다른 맛객이 먼저 쓸 수 있음). 지금 내 닉네임은 쓸 수 있다고 답합니다.
     */
    @GetMapping("/nickname-availability")
    public NicknameAvailability nicknameAvailability(@AuthenticationPrincipal Jwt jwt, @RequestParam String nickname) {
        return new NicknameAvailability(profiles.isNicknameAvailable(nickname, AuthenticatedAccount.id(jwt)));
    }

    /** 장소 서비스가 기록 작성자 정보를 확인할 때도 사용하며, 프로필이 없으면 404로 알립니다. */
    @GetMapping
    public ProfileView profile(@AuthenticationPrincipal Jwt jwt) {
        return profiles.findProfile(AuthenticatedAccount.id(jwt))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "맛객 프로필이 없습니다."));
    }

    @PutMapping
    public ProfileView updateProfile(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
        return profiles.updateProfile(AuthenticatedAccount.id(jwt), request);
    }

    @PutMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void uploadAvatar(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file)
            throws IOException {
        images.saveAvatar(AuthenticatedAccount.id(jwt), file);
    }

    /**
     * 가입 마지막 단계(SignupScreen)에서 카카오·네이버 프로필 사진을 내려받아 프로필 사진으로 둡니다. 사용자가 그 제공자에
     * 사진 제공을 동의했고 가입 화면에서 쓰기로 둔 때만 부릅니다. 이미 프로필 사진이 있으면 그대로 둡니다.
     */
    @PutMapping("/avatar/social")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void importSocialAvatar(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SocialAvatarRequest request) {
        images.saveSocialAvatar(AuthenticatedAccount.id(jwt), socialAvatars.download(request.imageUrl()));
    }

    @DeleteMapping("/avatar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeAvatar(@AuthenticationPrincipal Jwt jwt) {
        images.deleteAvatar(AuthenticatedAccount.id(jwt));
    }

    /** 배경 사진을 기존 갤러리 뒤에 추가하고, 추가 후 전체 배경 사진 주소를 순서대로 반환합니다. */
    @PostMapping(value = "/covers", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<String> uploadCoverGallery(
            @AuthenticationPrincipal Jwt jwt, @RequestParam("files") List<MultipartFile> files) throws IOException {
        return covers.addCovers(AuthenticatedAccount.id(jwt), files);
    }

    @DeleteMapping("/covers/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeCoverPhoto(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID photoId) {
        covers.removeCover(AuthenticatedAccount.id(jwt), photoId);
    }
}
