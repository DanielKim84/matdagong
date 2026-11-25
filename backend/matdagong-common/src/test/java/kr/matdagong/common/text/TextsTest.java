package kr.matdagong.common.text;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** 알림 문구의 목적격 조사를 마지막 글자의 소리에 맞게 고르는지 확인합니다. */
class TextsTest {

    @Test
    void 한글은_받침이_있으면_을_없으면_를이다() {
        assertThat(Texts.objectParticle("연남옥")).isEqualTo("을");
        assertThat(Texts.objectParticle("얼스어스 연남")).isEqualTo("을");
        assertThat(Texts.objectParticle("김밥천국")).isEqualTo("을");
        assertThat(Texts.objectParticle("라밥 회현점")).isEqualTo("을");
        assertThat(Texts.objectParticle("테라로사")).isEqualTo("를");
    }

    @Test
    void 숫자는_읽는_소리로_고르고_소리를_모르면_둘_다_적는다() {
        assertThat(Texts.objectParticle("요석궁 1779")).isEqualTo("를");
        assertThat(Texts.objectParticle("카페 3")).isEqualTo("을");
        assertThat(Texts.objectParticle("5TO7")).isEqualTo("을");
        assertThat(Texts.objectParticle("Blue Bottle")).isEqualTo("을(를)");
        assertThat(Texts.objectParticle(" ")).isEqualTo("을(를)");
    }
}
