package kr.matdagong.place.like;

import static kr.matdagong.place.like.PlaceLikeModels.*;

import jakarta.validation.Valid;
import java.util.List;
import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 하트(가볼 곳)·별로였던 곳의 목록·변경과, 별로였어요를 고를 수 있는 방문 근거 목록 API를 제공합니다. */
@RestController
@RequestMapping("/api/v1/places")
public class PlaceLikeController {
    private final PlaceLikeService likes;

    public PlaceLikeController(PlaceLikeService likes) {
        this.likes = likes;
    }

    @GetMapping("/likes")
    public List<String> likes(@AuthenticationPrincipal Jwt jwt) {
        return likes.likedPlaceIds(AuthenticatedAccount.id(jwt));
    }

    @PutMapping("/{placeId}/like")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setLike(
            @AuthenticationPrincipal Jwt jwt, @PathVariable String placeId, @RequestBody LikeRequest request) {
        likes.setLiked(AuthenticatedAccount.id(jwt), placeId, request.liked());
    }

    @GetMapping("/dislikes")
    public List<String> dislikes(@AuthenticationPrincipal Jwt jwt) {
        return likes.dislikedPlaceIds(AuthenticatedAccount.id(jwt));
    }

    @PutMapping("/{placeId}/dislike")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setDislike(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String placeId,
            @Valid @RequestBody DislikeRequest request) {
        likes.setDisliked(AuthenticatedAccount.id(jwt), placeId, request.disliked(), request.deviceLocation());
    }
}
