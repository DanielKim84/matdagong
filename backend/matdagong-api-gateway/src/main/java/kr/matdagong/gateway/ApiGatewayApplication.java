package kr.matdagong.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** 화면의 버전 API 요청을 기능별 백엔드 서비스로 전달하는 게이트웨이의 시작점입니다. */
@SpringBootApplication
public class ApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
