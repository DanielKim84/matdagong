package kr.matdagong.place.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.DelegatingServletInputStream;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.util.unit.DataSize;

/** 장소 API 요청 본문 크기 제한이 길이 표시 여부와 관계없이 413으로 막는지, 다른 경로는 건너뛰는지 확인합니다. */
class RequestSizeLimitFilterTest {
    private final RequestSizeLimitFilter filter = new RequestSizeLimitFilter(DataSize.ofBytes(10));

    @Test
    void Content_Length가_한도를_넘으면_본문을_읽기_전에_413_ProblemDetail로_거부한다() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/places/records");
        request.setContent(new byte[11]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean reachedController = new AtomicBoolean();

        filter.doFilter(request, response, (req, res) -> reachedController.set(true));

        assertThat(response.getStatus()).isEqualTo(413);
        assertThat(response.getContentType()).startsWith("application/problem+json");
        assertThat(response.getContentAsString()).contains("\"detail\":\"" + RequestSizeLimitFilter.TOO_LARGE + "\"");
        assertThat(reachedController).isFalse();
    }

    @Test
    void 한도_안의_요청은_그대로_전달한다() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/places/records");
        request.setContent(new byte[10]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean reachedController = new AtomicBoolean();

        filter.doFilter(request, response, (req, res) -> {
            assertThat(req.getInputStream().readAllBytes()).hasSize(10);
            reachedController.set(true);
        });

        assertThat(reachedController).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void 장소_API가_아닌_요청은_크기를_세지_않고_넘긴다() throws Exception {
        // 커뮤니티 사진 올리기는 spring.servlet.multipart 한도를 따르므로 이 필터가 막지 않습니다.
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/users/me/profile/covers");
        request.setContent(new byte[11]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean reachedController = new AtomicBoolean();

        filter.doFilter(request, response, (req, res) -> reachedController.set(true));

        assertThat(reachedController).isTrue();
    }

    @Test
    void 길이를_알리지_않은_본문도_읽는_도중_한도를_넘으면_중단한다() {
        RequestSizeLimitFilter.LimitedInputStream stream = new RequestSizeLimitFilter.LimitedInputStream(
                new DelegatingServletInputStream(new ByteArrayInputStream(new byte[100])), 10);

        assertThatThrownBy(stream::readAllBytes).isInstanceOf(RequestSizeLimitFilter.RequestTooLargeException.class);
    }
}
