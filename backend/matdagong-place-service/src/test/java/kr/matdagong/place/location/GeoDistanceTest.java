package kr.matdagong.place.location;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;

/** 하버사인 거리 계산이 1km 기준 판단에 쓸 만큼 정확한지 확인합니다. */
class GeoDistanceTest {
    @Test
    void 위도_0_009도는_약_1km이고_같은_점은_0이다() {
        assertThat(GeoDistance.meters(37.0, 127.0, 37.009, 127.0)).isCloseTo(1000.75, within(0.5));
        assertThat(GeoDistance.meters(37.566, 126.991, 37.566, 126.991)).isZero();
    }

    @Test
    void 서울시청에서_강남역까지는_약_8_8km다() {
        assertThat(GeoDistance.meters(37.5663, 126.9779, 37.4979, 127.0276)).isCloseTo(8_800, within(150.0));
    }
}
