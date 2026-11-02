package kr.matdagong.common.test;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * DB 테스트(*IntegrationTest)의 공통 바탕입니다. 테스트 클래스마다 embedded PostgreSQL을 한 번 띄우고 그 서비스의
 * Flyway 마이그레이션(classpath:db/migration)을 모두 적용합니다. 테스트끼리 데이터가 섞이지 않도록 각 테스트 클래스는
 * {@code @BeforeEach}에서 {@link #truncate(String)}로 쓰는 테이블을 비웁니다.
 */
public abstract class EmbeddedPostgresTestSupport {
    protected static EmbeddedPostgres postgres;
    protected static DataSource dataSource;
    protected static JdbcTemplate jdbc;

    @BeforeAll
    protected static void startEmbeddedDatabase() throws IOException {
        postgres = EmbeddedPostgres.start();
        dataSource = postgres.getPostgresDatabase();
        jdbc = new JdbcTemplate(dataSource);
        migrate(dataSource, null);
    }

    @AfterAll
    protected static void stopEmbeddedDatabase() throws IOException {
        if (postgres != null) postgres.close();
        postgres = null;
    }

    /** 여러 테이블은 쉼표로 이어 적습니다. 참조하는 하위 테이블도 함께 비웁니다. */
    protected static void truncate(String tables) {
        jdbc.execute("TRUNCATE " + tables + " CASCADE");
    }

    /** 마이그레이션 자체를 확인할 때 쓰는 빈 DB입니다. 같은 embedded 서버 안에 새 DB를 만듭니다. */
    protected static DataSource emptyDatabase(String name) {
        jdbc.execute("CREATE DATABASE " + name);
        return postgres.getDatabase("postgres", name);
    }

    /** target이 null이면 마지막 버전까지 적용합니다. */
    protected static void migrate(DataSource target, String version) {
        FluentConfiguration configuration =
                Flyway.configure().dataSource(target).locations("classpath:db/migration");
        if (version != null) configuration.target(version);
        configuration.load().migrate();
    }
}
