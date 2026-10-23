package kr.matdagong.place;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** 장소·지도 API만 독립적으로 제공하는 Spring Boot 서비스의 시작점입니다. */
@SpringBootApplication
public class PlaceServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(PlaceServiceApplication.class, args);
    }
}
