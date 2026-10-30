package kr.matdagong.community;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** 맛객 프로필·취향 태그·구독·포인트 원장·알림을 담당하는 커뮤니티 서비스의 시작점입니다. 알림 정리 작업을 위해 스케줄링을 켭니다. */
@SpringBootApplication
@EnableScheduling
public class CommunityServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CommunityServiceApplication.class, args);
    }
}
