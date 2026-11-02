package kr.matdagong.common.web;

import jakarta.validation.ConstraintViolation;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.ObjectError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * 서비스의 모든 오류 응답을 ProblemDetail로 맞추고, 화면이 그대로 보여 주는 detail은 항상 한국어로 채웁니다.
 * 각 서비스는 이 클래스를 상속한 @RestControllerAdvice 하나를 둡니다.
 *
 * <ul>
 *   <li>ResponseStatusException: 던질 때 적은 한국어 문구(reason)를 detail로 씁니다.
 *   <li>@Valid 실패: 요청 record 애너테이션에 적은 한국어 message를, 없으면 공통 안내를 씁니다.
 *   <li>그 밖의 Spring 오류(잘못된 JSON, 없는 주소 등): 상태 코드별 한국어 안내를 씁니다.
 * </ul>
 */
public abstract class ApiExceptionHandlerSupport extends ResponseEntityExceptionHandler {
    static final String INVALID_INPUT = "입력한 내용을 확인해 주세요.";
    static final String SERVER_ERROR = "서버에서 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandlerSupport.class);

    /** 예상하지 못한 오류도 내부 메시지(SQL 등)를 숨기고 같은 형식으로 답합니다. 원인은 서버 로그에 남깁니다. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception exception, WebRequest request) {
        log.error("요청을 처리하지 못했습니다.", exception);
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        return handleExceptionInternal(exception, ProblemDetail.forStatus(status), new HttpHeaders(), status, request);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception exception, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        // Spring 기본 처리기는 body 없이 넘기고 부모 클래스가 예외에서 ProblemDetail을 꺼내므로, 여기서 먼저 꺼내 문구를 바꿉니다.
        if (body == null && exception instanceof ErrorResponse errorResponse) {
            body = errorResponse.updateAndGetBody(getMessageSource(), LocaleContextHolder.getLocale());
        }
        if (body instanceof ProblemDetail problem) {
            problem.setDetail(detailFor(exception, statusCode));
        }
        return super.handleExceptionInternal(exception, body, headers, statusCode, request);
    }

    /** 서비스별 핸들러가 특정 예외의 문구를 바꿀 때 덮어씁니다. */
    protected String detailFor(Exception exception, HttpStatusCode status) {
        if (exception instanceof ResponseStatusException statusException
                && statusException.getReason() != null
                && !statusException.getReason().isBlank()) {
            return statusException.getReason();
        }
        if (exception instanceof MethodArgumentNotValidException invalid) {
            return validationMessage(invalid.getBindingResult().getAllErrors());
        }
        if (exception instanceof HandlerMethodValidationException invalid) {
            return validationMessage(invalid.getAllErrors());
        }
        return defaultDetail(status);
    }

    /** 상태 코드만 있고 화면에 보여 줄 문구가 없을 때 쓰는 한국어 안내입니다. */
    static String defaultDetail(HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> "요청 내용을 확인해 주세요.";
            case 401 -> "로그인이 필요합니다.";
            case 403 -> "접근 권한이 없습니다.";
            case 404 -> "요청한 정보를 찾을 수 없습니다.";
            case 405 -> "지원하지 않는 요청 방식입니다.";
            case 409 -> "현재 상태에서는 요청을 처리할 수 없습니다.";
            case 413 -> "요청 용량이 너무 커요.";
            case 415 -> "지원하지 않는 요청 형식입니다.";
            default -> status.is5xxServerError() ? SERVER_ERROR : "요청을 처리하지 못했어요.";
        };
    }

    /** 검증 애너테이션에 직접 적은 message가 있으면 그 문구를, 기본 문구(영어 등)뿐이면 공통 안내를 씁니다. */
    private static String validationMessage(List<? extends MessageSourceResolvable> errors) {
        return errors.stream()
                .map(ApiExceptionHandlerSupport::customMessage)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(INVALID_INPUT);
    }

    private static String customMessage(MessageSourceResolvable error) {
        if (!(error instanceof ObjectError objectError) || !objectError.contains(ConstraintViolation.class)) {
            return null;
        }
        // 기본 문구는 "{jakarta.validation...}" 같은 메시지 키로 시작합니다.
        String template = objectError.unwrap(ConstraintViolation.class).getMessageTemplate();
        return template.startsWith("{") ? null : objectError.getDefaultMessage();
    }
}
