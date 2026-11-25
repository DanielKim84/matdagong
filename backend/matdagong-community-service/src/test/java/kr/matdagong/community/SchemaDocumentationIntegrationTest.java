package kr.matdagong.community;

import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.common.test.SchemaDocumentation;
import org.junit.jupiter.api.Test;

/** 새 마이그레이션에서 운영 스키마 설명을 빠뜨리지 않도록 확인합니다. */
class SchemaDocumentationIntegrationTest extends EmbeddedPostgresTestSupport {
    @Test
    void 모든_테이블과_칼럼에_설명이_있다() {
        SchemaDocumentation.assertComplete(jdbc);
    }
}
