package kr.matdagong.common.jdbc;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** 검색어 이스케이프 결과를 확인합니다. 실제 SQL에서 글자 그대로 찾는지는 장소 검색 통합 테스트가 확인합니다. */
class LikePatternsTest {
    @Test
    void 와일드카드와_이스케이프_문자는_글자_그대로_찾도록_바꾼다() {
        assertThat(LikePatterns.escape("100%_국밥\\집")).isEqualTo("100\\%\\_국밥\\\\집");
        assertThat(LikePatterns.contains("%")).isEqualTo("%\\%%");
        assertThat(LikePatterns.contains("국밥")).isEqualTo("%국밥%");
    }
}
