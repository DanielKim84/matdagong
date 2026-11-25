package kr.matdagong.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import kr.matdagong.place.security.RequestSizeLimitFilter;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** 장소 API 본문을 읽는 도중 크기 한도를 넘어도 Content-Length로 막은 것과 같은 413 문구로 답하는지 확인합니다. */
class ApiExceptionHandlerTest {
    @Test
    void 읽는_도중_한도를_넘어_JSON_변환이_실패해도_같은_413_문구로_응답한다() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new OversizedBodyController())
                .setControllerAdvice(new ApiExceptionHandler())
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
