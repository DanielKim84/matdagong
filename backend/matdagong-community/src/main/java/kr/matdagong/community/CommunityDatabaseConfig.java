package kr.matdagong.community;

import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;

/**
 * 커뮤니티 DB 연결입니다. 장소 DB와 따로 두므로 Spring Boot의 단일 DB 자동 설정 대신 여기서 연결·트랜잭션·Flyway를 만듭니다.
 * 마이그레이션은 커뮤니티 모듈의 classpath:db/migration/community만 적용합니다(장소 것과 섞이지 않게 폴더를 나눔).
 */
@Configuration(proxyBeanMethods = false)
public class CommunityDatabaseConfig {
    @Bean(destroyMethod = "close")
    @CommunityDatabase
    HikariDataSource communityDataSource(
            @Value("${dagong.community.datasource.url}") String url,
            @Value("${dagong.community.datasource.username}") String username,
            @Value("${dagong.community.datasource.password}") String password) {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setPoolName("community-db");
        dataSource.setJdbcUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return dataSource;
    }

    /** 서버가 요청을 받기 전에 커뮤니티 DB를 최신 스키마로 올립니다. */
    @Bean(initMethod = "migrate")
    Flyway communityFlyway(@CommunityDatabase DataSource dataSource) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration/community")
                .load();
    }

    @Bean
    @CommunityDatabase
    @DependsOn("communityFlyway")
    JdbcTemplate communityJdbcTemplate(@CommunityDatabase DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Bean(CommunityDatabase.TRANSACTIONS)
    DataSourceTransactionManager communityTransactionManager(@CommunityDatabase DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }
}
