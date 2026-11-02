package kr.matdagong.place;

import kr.matdagong.common.web.ApiExceptionHandlerSupport;
import kr.matdagong.place.security.RequestSizeLimitFilter.RequestTooLargeException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

/** 장소 API의 모든 오류를 한국어 detail이 담긴 ProblemDetail로 응답합니다. */
@RestControllerAdvice
public class PlaceExceptionHandler extends ApiExceptionHandlerSupport {
    /**
     * 본문을 읽는 도중 크기 한도를 넘으면 JSON 변환 오류로 올라오므로, Content-Length로 먼저 막은 경우와 같은 413으로
     * 바꿉니다.
     */
    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        if (hasCause(exception, RequestTooLargeException.class)) {
            HttpStatus tooLarge = HttpStatus.CONTENT_TOO_LARGE;
            return handleExceptionInternal(exception, ProblemDetail.forStatus(tooLarge), headers, tooLarge, request);
        }
        return super.handleHttpMessageNotReadable(exception, headers, status, request);
    }

    private static boolean hasCause(Throwable exception, Class<? extends Throwable> type) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (type.isInstance(cause)) return true;
        }
        return false;
    }
}
