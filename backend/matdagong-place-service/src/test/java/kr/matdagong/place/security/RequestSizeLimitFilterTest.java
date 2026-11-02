package kr.matdagong.place.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.util.concurrent.atomic.AtomicBoolean;
import kr.matdagong.place.PlaceExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.mock.web.DelegatingServletInputStream;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.util.unit.DataSize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

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
    void 길이를_알리지_않은_본문도_읽는_도중_한도를_넘으면_중단한다() {
        RequestSizeLimitFilter.LimitedInputStream stream = new RequestSizeLimitFilter.LimitedInputStream(
                new DelegatingServletInputStream(new ByteArrayInputStream(new byte[100])), 10);

        assertThatThrownBy(stream::readAllBytes).isInstanceOf(RequestSizeLimitFilter.RequestTooLargeException.class);
    }

    @Test
    void 읽는_도중_한도를_넘어_JSON_변환이_실패해도_같은_413_문구로_응답한다() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new OversizedBodyController())
                .setControllerAdvice(new PlaceExceptionHandler())
                .build();

        mvc.perform(post("/oversized"))
                .andExpect(status().isContentTooLarge())
                .andExpect(jsonPath("$.detail").value(RequestSizeLimitFilter.TOO_LARGE));
    }

    @RestController
    static class OversizedBodyController {
        @PostMapping("/oversized")
        void read() {
            throw new HttpMessageNotReadableException(
                    "I/O error while reading input message",
                    new RequestSizeLimitFilter.RequestTooLargeException(),
                    new MockHttpInputMessage(new byte[0]));
        }
    }
}
