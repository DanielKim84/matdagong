package kr.matdagong.place.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.unit.DataSize;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 맛집 기록은 사진을 base64 JSON으로 받으므로, JSON 파싱 전에 요청 본문 크기를 제한해 메모리 고갈을 막습니다.
 * Gateway에도 같은 제한이 있지만 서비스 포트로 직접 들어온 요청과 Content-Length 없는 요청도 여기서 막습니다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestSizeLimitFilter extends OncePerRequestFilter {
    private final long maxBytes;

    public RequestSizeLimitFilter(@Value("${dagong.place.max-request-size:30MB}") DataSize maxRequestSize) {
        this.maxBytes = maxRequestSize.toBytes();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getContentLengthLong() > maxBytes) {
            response.sendError(HttpStatus.CONTENT_TOO_LARGE.value(), "요청 용량이 너무 커요.");
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

    /** 본문을 읽는 도중 한도를 넘었음을 알립니다. JSON 변환이 실패해 요청은 400으로 끝나고 나머지 본문은 읽지 않습니다. */
    public static final class RequestTooLargeException extends IOException {
        RequestTooLargeException() {
            super("요청 용량이 너무 커요.");
        }
    }
}
