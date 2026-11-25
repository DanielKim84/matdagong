package kr.matdagong.place;

import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.common.test.SchemaDocumentation;
import org.junit.jupiter.api.Test;

/** 장소·기록·사진 스키마 설명을 현재 Flyway 결과로 검사합니다. */
class SchemaDocumentationIntegrationTest extends EmbeddedPostgresTestSupport {
    @Test
    void 모든_테이블과_칼럼에_설명이_있다() {
        SchemaDocumentation.assertComplete(jdbc);
    }
}
