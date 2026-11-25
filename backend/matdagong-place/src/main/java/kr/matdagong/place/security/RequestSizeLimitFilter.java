package kr.matdagong.place.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 맛집 기록은 사진을 base64 JSON으로 받으므로, JSON 파싱 전에 장소 API 요청 본문 크기를 제한해 메모리 고갈을 막습니다.
 * Content-Length를 보내지 않은 요청도 읽은 양을 세어 막습니다. 커뮤니티의 사진 올리기(multipart)는 이 필터가 아니라
 * spring.servlet.multipart 한도(matdagong-api application.yml)를 따릅니다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestSizeLimitFilter extends OncePerRequestFilter {
    /** 413 응답 문구입니다. 읽는 도중 한도를 넘은 경우도 ApiExceptionHandler가 같은 문구를 씁니다. */
    public static final String TOO_LARGE = "요청 용량이 너무 커요.";
    /** 장소 API 경로입니다. 다른 경로(커뮤니티 API·사진 주소)는 이 필터를 건너뜁니다. */
    private static final String PLACE_API = "/api/v1/places";
    /** Spring MVC에 닿기 전에 끊으므로 ApiExceptionHandler(matdagong-api)와 같은 ProblemDetail 모양을 직접 씁니다. */
    private static final String TOO_LARGE_BODY =
            """
            {"type":"about:blank","title":"Content Too Large","status":413,"detail":"%s"}
            """
                    .formatted(TOO_LARGE)
                    .strip();

    private final long maxBytes;

    public RequestSizeLimitFilter(@Value("${dagong.place.max-request-size}") DataSize maxRequestSize) {
        this.maxBytes = maxRequestSize.toBytes();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(path.equals(PLACE_API) || path.startsWith(PLACE_API + "/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getContentLengthLong() > maxBytes) {
            response.setStatus(HttpStatus.CONTENT_TOO_LARGE.value());
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write(TOO_LARGE_BODY);
            return;
        }
        chain.doFilter(new LimitedRequest(request, maxBytes), response);
    }

    /** Content-Length를 보내지 않은 요청도 읽은 양을 세어 한도를 넘으면 중단합니다. */
    static final class LimitedRequest extends HttpServletRequestWrapper {
        private final long maxBytes;
        private ServletInputStream limitedStream;

        LimitedRequest(HttpServletRequest request, long maxBytes) {
            super(request);
            this.maxBytes = maxBytes;
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            if (limitedStream == null) limitedStream = new LimitedInputStream(super.getInputStream(), maxBytes);
            return limitedStream;
        }
    }

    static final class LimitedInputStream extends ServletInputStream {
        private final ServletInputStream delegate;
        private final long maxBytes;
        private long readBytes;

        LimitedInputStream(ServletInputStream delegate, long maxBytes) {
            this.delegate = delegate;
            this.maxBytes = maxBytes;
        }

        @Override
        public int read() throws IOException {
            int value = delegate.read();
            if (value != -1) count(1);
            return value;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            int read = delegate.read(buffer, offset, length);
            if (read > 0) count(read);
            return read;
        }

        private void count(int bytes) throws IOException {
            readBytes += bytes;
            if (readBytes > maxBytes) throw new RequestTooLargeException();
        }

        @Override
        public boolean isFinished() {
            return delegate.isFinished();
        }

        @Override
        public boolean isReady() {
            return delegate.isReady();
        }

        @Override
        public void setReadListener(ReadListener listener) {
            delegate.setReadListener(listener);
        }
    }

    /** 본문을 읽는 도중 한도를 넘었음을 알립니다. 나머지 본문은 읽지 않고, ApiExceptionHandler(matdagong-api)가 413으로 응답합니다. */
    public static final class RequestTooLargeException extends IOException {
        public RequestTooLargeException() {
            super(TOO_LARGE);
        }
    }
}
