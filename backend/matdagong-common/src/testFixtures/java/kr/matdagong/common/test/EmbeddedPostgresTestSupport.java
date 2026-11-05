package kr.matdagong.common.test;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Supplier;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/**
 * DB 테스트(*IntegrationTest)의 공통 바탕입니다. 테스트 클래스마다 embedded PostgreSQL을 한 번 띄우고 그 서비스의
 * Flyway 마이그레이션(classpath:db/migration)을 모두 적용합니다. 테스트끼리 데이터가 섞이지 않도록 각 테스트 클래스는
 * {@code @BeforeEach}에서 {@link #truncate(String)}로 쓰는 테이블을 비웁니다.
 */
public abstract class EmbeddedPostgresTestSupport {
    private static final Duration LOCK_WAIT_TIMEOUT = Duration.ofSeconds(10);
    private static final long LOCK_POLL_MILLIS = 20;

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

    /**
     * 확인과 저장 사이에 다른 요청이 끼어드는 동시성 상황을 순서대로 재현합니다. 다른 트랜잭션에서 uncommitted를 실행해
     * 커밋하지 않은 채 두고, call을 다른 스레드에서 시작해 그 행을 기다리기 시작하면(잠금 대기) 다른 트랜잭션을 커밋합니다.
     * call이 기다리지 않고 끝나도 그대로 결과를 돌려주므로, 기다렸는지가 아니라 결과를 단언합니다.
     *
     * @return call의 결과. call이 던진 실행 중 예외는 그대로 다시 던집니다.
     */
    protected static <T> T callBlockedByUncommitted(Consumer<JdbcTemplate> uncommitted, Supplier<T> call)
            throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            uncommitted.accept(new JdbcTemplate(new SingleConnectionDataSource(connection, true)));
            CompletableFuture<T> result = CompletableFuture.supplyAsync(call);
            awaitLockWaitOrDone(result);
            connection.commit();
            try {
                return result.get(LOCK_WAIT_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
            } catch (ExecutionException exception) {
                if (exception.getCause() instanceof RuntimeException cause) throw cause;
                throw exception;
            }
        }
    }

    private static void awaitLockWaitOrDone(CompletableFuture<?> result) throws InterruptedException {
        long deadline = System.nanoTime() + LOCK_WAIT_TIMEOUT.toNanos();
        while (!result.isDone() && System.nanoTime() < deadline) {
            Integer waiting = jdbc.queryForObject(
                    "SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock'", Integer.class);
            if (waiting != null && waiting > 0) return;
            Thread.sleep(LOCK_POLL_MILLIS);
        }
    }

    /** version이 null이면 마지막 버전까지 적용합니다. */
    protected static void migrate(DataSource target, String version) {
        FluentConfiguration configuration =
                Flyway.configure().dataSource(target).locations("classpath:db/migration");
        if (version != null) configuration.target(version);
        configuration.load().migrate();
    }
}
