package kr.matdagong.api;

import java.util.UUID;
import kr.matdagong.common.security.AuthenticatedAccount;
import kr.matdagong.community.profile.WithdrawalService;
import kr.matdagong.place.account.AccountDataService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 맛다공 탈퇴: 로그인한 계정의 장소 데이터와 커뮤니티 데이터를 차례로 모두 지웁니다. 공통 계정의 맛다공 가입 취소는 화면이
 * 이 요청 뒤에 인증 서버에 따로 보냅니다(docs/api-boundaries.md#탈퇴). 두 DB는 따로라 한 트랜잭션으로 묶이지 않지만,
 * 둘 다 이미 지운 것을 다시 지워도 그대로 성공하므로 중간에 실패하면 같은 요청을 다시 보내면 됩니다.
 */
@RestController
@RequestMapping("/api/v1/users/me")
public class WithdrawalController {
    private final AccountDataService placeData;
    private final WithdrawalService communityData;

    public WithdrawalController(AccountDataService placeData, WithdrawalService communityData) {
        this.placeData = placeData;
        this.communityData = communityData;
    }

    /** 장소 데이터를 먼저 지워, 프로필이 지워진 뒤 작성자 없는 기록이 남지 않게 합니다. 프로필이 없어도 204로 답합니다. */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void withdraw(@AuthenticationPrincipal Jwt jwt) {
        UUID accountId = AuthenticatedAccount.id(jwt);
        placeData.deleteAll(accountId);
        communityData.withdraw(accountId);
    }
}
