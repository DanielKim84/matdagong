package kr.matdagong.community;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** 맛객 프로필과 방문 기록, 리뷰, 구독 등 커뮤니티 기능을 담당하는 서비스의 시작점입니다. */
@SpringBootApplication
public class CommunityServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CommunityServiceApplication.class, args);
    }
}
