package kr.matdagong.community;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.beans.factory.annotation.Qualifier;

/**
 * 커뮤니티 DB(matdagong_community)로 이어지는 DataSource·JdbcTemplate을 고릅니다. 한 서버가 장소·커뮤니티 DB를 함께 쓰므로 커뮤니티
 * 모듈의 코드는 이 표시가 붙은 것만 주입받고, 트랜잭션도 {@link #TRANSACTIONS}로 엽니다(CommunityDatabaseConfig).
 */
@Qualifier
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.PARAMETER, ElementType.FIELD, ElementType.METHOD, ElementType.TYPE})
public @interface CommunityDatabase {
    /** 커뮤니티 DB 트랜잭션 관리자 이름입니다. {@code @Transactional(transactionManager = CommunityDatabase.TRANSACTIONS)}에 씁니다. */
    String TRANSACTIONS = "communityTransactionManager";
}
