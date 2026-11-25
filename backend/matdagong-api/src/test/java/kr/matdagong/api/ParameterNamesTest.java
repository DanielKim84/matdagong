package kr.matdagong.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.stream.Stream;
import kr.matdagong.community.profile.UserProfileController;
import kr.matdagong.place.catalog.PlaceController;
import org.junit.jupiter.api.Test;

/**
 * 컨트롤러의 @RequestParam·@PathVariable은 매개변수 이름을 그대로 쓰므로, 라이브러리 모듈(장소·커뮤니티)도 -parameters로
 * 컴파일해야 합니다(루트 build.gradle). 빠지면 실행 중에만 500이 나서 여기서 미리 잡습니다.
 */
class ParameterNamesTest {
    @Test
    void 장소와_커뮤니티_모듈의_컨트롤러는_매개변수_이름을_남긴다() {
        Stream.of(PlaceController.class, UserProfileController.class)
                .flatMap(controller -> Stream.of(controller.getDeclaredMethods()))
                // 람다가 만든 숨은 메서드는 요청과 상관없어 뺍니다.
                .filter(method -> !method.isSynthetic())
                .flatMap((Method method) -> Stream.of(method.getParameters()))
                .forEach((Parameter parameter) -> assertThat(parameter.isNamePresent())
                        .as(parameter.toString())
                        .isTrue());
    }
}
