package kr.matdagong.place;

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
 * 장소 DB 연결입니다. 커뮤니티 DB와 따로 두므로 Spring Boot의 단일 DB 자동 설정 대신 여기서 연결·트랜잭션·Flyway를 만듭니다.
 * 마이그레이션은 장소 모듈의 classpath:db/migration/place만 적용합니다(커뮤니티 것과 섞이지 않게 폴더를 나눔).
 */
@Configuration(proxyBeanMethods = false)
public class PlaceDatabaseConfig {
    @Bean(destroyMethod = "close")
    @PlaceDatabase
    HikariDataSource placeDataSource(
            @Value("${dagong.place.datasource.url}") String url,
            @Value("${dagong.place.datasource.username}") String username,
            @Value("${dagong.place.datasource.password}") String password) {
        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setPoolName("place-db");
        dataSource.setJdbcUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return dataSource;
    }

    /** 서버가 요청을 받기 전에 장소 DB를 최신 스키마로 올립니다. */
    @Bean(initMethod = "migrate")
    Flyway placeFlyway(@PlaceDatabase DataSource dataSource) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration/place")
                .load();
    }

    @Bean
    @PlaceDatabase
    @DependsOn("placeFlyway")
    JdbcTemplate placeJdbcTemplate(@PlaceDatabase DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Bean(PlaceDatabase.TRANSACTIONS)
    DataSourceTransactionManager placeTransactionManager(@PlaceDatabase DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }
}
