package kr.matdagong.community.profile;

import kr.matdagong.common.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 로그인한 계정의 맛다공 회원 탈퇴 요청을 처리합니다. 공통 계정의 맛다공 가입 취소는 인증 서버가 따로 맡습니다. */
@RestController
@RequestMapping("/api/v1/users/me")
public class WithdrawalController {
    private final WithdrawalService withdrawals;

    public WithdrawalController(WithdrawalService withdrawals) {
        this.withdrawals = withdrawals;
    }

    /** 프로필이 없거나 이미 지운 계정도 204로 답해 화면이 다시 시도해도 안전합니다. */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void withdraw(@AuthenticationPrincipal Jwt jwt) {
        withdrawals.withdraw(AuthenticatedAccount.id(jwt));
    }
}
