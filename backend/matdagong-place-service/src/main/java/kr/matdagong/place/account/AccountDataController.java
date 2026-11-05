package kr.matdagong.place.account;

import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 맛다공 탈퇴 때 장소 서비스에 남은 내 데이터를 모두 지웁니다. 화면은 커뮤니티·공통 로그인 정리보다 먼저 부릅니다. */
@RestController
@RequestMapping("/api/v1/places/me")
public class AccountDataController {
    private final AccountDataService accountData;

    public AccountDataController(AccountDataService accountData) {
        this.accountData = accountData;
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMyData(@AuthenticationPrincipal Jwt jwt) {
        accountData.deleteAll(AuthenticatedAccount.id(jwt));
    }
}
