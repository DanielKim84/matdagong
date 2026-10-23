# 백엔드 서비스

각 Gradle 모듈은 독립 실행 가능한 Spring Boot 서버입니다. 모듈 간 코드는 직접 참조하지 않고 API Gateway가 버전이 있는 HTTP 경로를 전달합니다.

```text
matdagong-api-gateway       :5843
├─ /api/v1/places/**        → matdagong-place-service       :5845
└─ /api/v1/{users,tasters,diary,subscriptions,notifications}/**
                             → matdagong-community-service   :5844
```

각 도메인 서비스는 자체 데이터베이스를 소유하며 다른 서비스의 테이블을 직접 조회하지 않습니다. 사용자의 공통 로그인 ID와 계정 상태는 `dagong-auth`가 소유하고, 커뮤니티 서비스는 맛다공 안에서 필요한 프로필·활동 정보를 소유합니다.

서비스 내부 코드는 다음 경계를 따릅니다.

```text
kr.matdagong.<domain>/
├─ api/             # REST 컨트롤러와 요청·응답 DTO
├─ application/     # 유스케이스와 트랜잭션 경계
├─ domain/          # 도메인 모델과 정책
└─ infrastructure/  # 저장소와 외부 시스템 연동
```
