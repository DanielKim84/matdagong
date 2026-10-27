# 백엔드 서비스

각 Gradle 모듈은 독립 실행 가능한 Spring Boot 서버입니다. 모듈 간 코드는 직접 참조하지 않고 API Gateway가 버전이 있는 HTTP 경로를 전달합니다.

```text
matdagong-api-gateway       :5843
├─ /api/v1/places/**        → matdagong-place-service       :5845
└─ /api/v1/{users,tasters,taste-tags,diary,subscriptions,notifications}/**
                             → matdagong-community-service   :5844
```

각 도메인 서비스는 자체 데이터베이스를 소유하며 다른 서비스의 테이블을 직접 조회하지 않습니다. 사용자의 공통 로그인 ID와 계정 상태는 `dagong-auth`가 소유하고, 커뮤니티 서비스는 맛다공 안에서 필요한 프로필·활동 정보를 소유합니다.

커뮤니티 서비스 스키마는 `backend/matdagong-community-service/src/main/resources/db/migration`의 Flyway SQL이 관리합니다. `user_subscriptions`는 현재 구독 관계, `user_subscription_history`는 구독 회차별 기간·금액 이력입니다. 장소 방문 조건은 현재 등록자 브라우저 저장소에 기록하고, 서버 장소 목록은 개발용 샘플입니다. 취향 태그는 `MENU`와 `VISIT` 두 분류의 관리 목록에서 선택합니다. `account_id`는 공통 인증 DB의 사용자 UUID를 값으로만 참조하고 DB 간 외래 키는 두지 않습니다. 개발용 구독 대상 프로필은 `infra/postgres/dev/seed-community-test-users.sql`로 추가할 수 있으며, 이 프로필은 로그인 가능한 공통 계정이 아닙니다.

구독 API는 맛다공 access token을 검증합니다. 무료 구독은 사용자당 한 명까지 유지하며 새 무료 구독 신청 시 기존 무료 구독을 종료합니다. 유료 구독은 1·3·6·12개월 기간을 제공하고, 현재 요금은 개발 테스트용으로만 사용하며 결제 요청은 즉시 성공 처리합니다.

현재 서비스 내부 코드는 기능별로 묶습니다. 장소는 조회 API와 샘플 카탈로그를, 커뮤니티는 프로필·이미지·취향과 구독을 제공합니다. JDBC로 데이터를 조회하며, 커뮤니티 스키마는 Flyway가 관리합니다. 장소 서비스는 아직 DB를 사용하지 않습니다.

```text
kr.matdagong.community/
├─ profile/         # 프로필·이미지·취향 태그 API와 이미지 저장 서비스
├─ subscription/    # 구독 API·요금·회차 처리
└─ security/        # 공통 계정 토큰 검증
```

태그 추가 요청은 `taste_tag_requests`에 저장합니다. `POST /api/v1/taste-tags/requests`는 태그명·분류·사유를 접수하고, `GET /api/v1/taste-tags/requests/mine`은 로그인한 본인의 최근 20건을 반환합니다. 같은 사용자의 동일 태그 검토 대기 요청과 기존 목록에 있는 태그는 중복 접수하지 않습니다. 요청은 `PENDING`으로 시작하고 검토 결과·검토자·처리일을 보관합니다. 관리자 검토 화면과 승인 처리는 추후 관리자 서비스에서 구현합니다.
