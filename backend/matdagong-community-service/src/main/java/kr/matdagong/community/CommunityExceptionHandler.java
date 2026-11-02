package kr.matdagong.community;

import kr.matdagong.common.web.ApiExceptionHandlerSupport;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 커뮤니티 API의 모든 오류를 한국어 detail이 담긴 ProblemDetail로 응답합니다. */
@RestControllerAdvice
public class CommunityExceptionHandler extends ApiExceptionHandlerSupport {}
