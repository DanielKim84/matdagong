package kr.matdagong;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 맛다공 API 서버의 시작점입니다. 장소 모듈(kr.matdagong.place)과 커뮤니티 모듈(kr.matdagong.community)을 한 서버로 띄우고,
 * 두 모듈에 걸친 보안·오류 응답·로그인 확인·탈퇴는 kr.matdagong.api에 둡니다. 알림 정리 작업을 위해 스케줄링을 켭니다.
 * 모듈마다 자기 DB를 쓰므로 단일 DB 자동 설정은 application.yml에서 끕니다(PlaceDatabaseConfig·CommunityDatabaseConfig).
 */
@SpringBootApplication
@EnableScheduling
public class MatdagongApplication {
    public static void main(String[] args) {
        SpringApplication.run(MatdagongApplication.class, args);
    }
}
