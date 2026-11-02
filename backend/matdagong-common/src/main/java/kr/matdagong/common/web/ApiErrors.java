package kr.matdagong.common.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 여러 서비스·화면에서 같은 상황에 같은 상태 코드와 문구로 답하도록 모은 오류입니다. */
public final class ApiErrors {
    /** 프로필이 있어야 하는 쓰기 요청을 프로필 없이 보낸 경우입니다. 조회 결과 없음(404)과 구분해 409로 답합니다. */
    public static final String PROFILE_REQUIRED = "맛객 프로필을 먼저 만들어 주세요.";

    private ApiErrors() {}

    public static ResponseStatusException profileRequired() {
        return new ResponseStatusException(HttpStatus.CONFLICT, PROFILE_REQUIRED);
    }
}
