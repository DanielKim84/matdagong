package kr.matdagong.place;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 장소·맛집 기록·하트·다녀온 곳·빠른 저장·최근 본 곳·제보 API를 제공하는 장소 서비스의 시작점입니다. 가려진 맛객 목록을
 * 주기적으로 받으려고 스케줄링을 켭니다.
 */
@SpringBootApplication
@EnableScheduling
public class PlaceServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PlaceServiceApplication.class, args);
    }
}
