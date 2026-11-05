package kr.matdagong.common.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/** 오류 응답이 한국어 detail을 담은 ProblemDetail로 나가는지 확인합니다. */
class ApiExceptionHandlerSupportTest {
    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new SampleController())
            .setControllerAdvice(new SampleExceptionHandler())
            .build();

    @Test
    void 던질_때_적은_한국어_문구를_detail로_내려준다() throws Exception {
        mvc.perform(get("/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.detail").value(ApiErrors.PROFILE_REQUIRED));
    }

    @Test
    void 문구가_없는_오류는_상태별_한국어_안내를_쓴다() throws Exception {
        mvc.perform(get("/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("요청한 정보를 찾을 수 없습니다."));
        mvc.perform(post("/items").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("요청 내용을 확인해 주세요."));
    }

    @Test
    void 검증_실패는_애너테이션의_한국어_문구를_쓰고_없으면_공통_안내를_쓴다() throws Exception {
        mvc.perform(post("/items").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("이름을 입력해 주세요."));
        mvc.perform(post("/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"국밥\",\"code\":\"ABCD\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(ApiExceptionHandlerSupport.INVALID_INPUT));
    }

    @Test
    void 예상하지_못한_오류는_내부_메시지를_숨긴다() throws Exception {
        mvc.perform(get("/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.detail").value(ApiExceptionHandlerSupport.SERVER_ERROR));
    }

    @RestController
    static class SampleController {
        @GetMapping("/conflict")
        void conflict() {
            throw ApiErrors.profileRequired();
        }

        @GetMapping("/missing")
        void missing() {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        @PostMapping("/items")
        void create(@Valid @RequestBody Item item) {}

        @GetMapping("/boom")
        void boom() {
            throw new IllegalStateException("relation user_profiles does not exist");
        }
    }

    record Item(@NotBlank(message = "이름을 입력해 주세요.") String name, @Size(max = 3) String code) {}

    @RestControllerAdvice
    static class SampleExceptionHandler extends ApiExceptionHandlerSupport {}
}
