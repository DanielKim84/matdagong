# 백엔드 서비스

각 Gradle 모듈은 독립 실행 가능한 Spring Boot 서버입니다. 모듈 간 코드는 직접 참조하지 않습니다. 브라우저 요청은 API Gateway가 버전이 있는 HTTP 경로로 전달하고, 서비스끼리 확인이 필요할 때는 Gateway를 거치지 않고 사용자의 access token을 그대로 실어 상대 서비스 API를 직접 호출합니다.

```text
matdagong-api-gateway       :5843
├─ /api/v1/places/**, /media/place-record-photos/**, /media/place-menu-photos/**
│                            → matdagong-place-service       :5845  (요청 본문 최대 30MB)
└─ /api/v1/{users,tasters,taste-tags,subscriptions,notifications,points}/**, /media/profiles/**
                             → matdagong-community-service   :5844  (요청 본문 최대 55MB)

matdagong-place-service ──GET /api/v1/users/me/profile──→ matdagong-community-service   (COMMUNITY_SERVICE_URL)
matdagong-community-service ──GET /api/v1/places/{id}──→ matdagong-place-service       (PLACE_SERVICE_URL)
```

장소 서비스는 기록을 저장할 때 작성자 닉네임·캐릭터를 커뮤니티 프로필에서 가져오고, 커뮤니티 서비스는 맛집 등록 알림을 만들기 전에 장소 서비스에서 본인 기록과 공개 여부를 확인합니다. 두 호출 모두 DB 트랜잭션 밖에서 먼저 끝냅니다.

각 도메인 서비스는 자체 데이터베이스를 소유하며 다른 서비스의 테이블을 직접 조회하지 않습니다. 커뮤니티 서비스는 `COMMUNITY_DB_*`, 장소 서비스는 `PLACE_DB_*` 접속 설정을 사용합니다. 기본값은 `docker-compose.yml`의 로컬 PostgreSQL에 있는 `matdagong_community`, `matdagong_places` DB입니다. 사용자의 공통 로그인 ID와 계정 상태는 `dagong-auth`가 소유하고, 각 맛다공 서비스는 공통 계정 UUID를 서비스 데이터의 소유자 값으로 저장합니다.

커뮤니티 스키마는 `backend/matdagong-community-service/src/main/resources/db/migration`, 장소 스키마는 `backend/matdagong-place-service/src/main/resources/db/migration`의 Flyway SQL이 관리합니다. 적용된 마이그레이션은 공유 개발 DB의 체크섬과 맞아야 하므로 수정하지 않고 새 버전으로 변경합니다. `user_subscriptions`는 현재 구독 관계, `user_subscription_history`는 구독 회차별 기간·금액 이력입니다. 프로필 배경 사진은 `user_profile_cover_photos`에 맛객당 최대 10장까지 저장합니다. 장소 서비스의 `restaurant_places`는 카카오 장소 ID로 중복을 합치고 `restaurant_records` 및 하위 메뉴·태그·방문 조건·사진 테이블은 맛객별 추천 정보를 보관합니다. `user_place_likes`는 계정별 하트 목록, `user_recent_places`는 최근 본 장소, `place_quick_drafts`는 기록을 나중에 쓰려고 담아 둔 장소입니다. 취향 태그는 `MENU`와 `VISIT` 두 분류의 관리 목록에서 선택합니다. 계정 UUID는 인증 DB와 외래 키로 연결하지 않고 값으로만 보관합니다. 개발용 구독 대상 프로필은 `infra/postgres/dev/seed-community-test-users.sql`로 추가할 수 있으며, 이 프로필은 로그인 가능한 공통 계정이 아닙니다.

구독 API는 맛다공 access token을 검증합니다. 무료 구독은 사용자당 한 명까지 유지하며 새 무료 구독 신청 시 기존 무료 구독을 종료합니다. 유료 구독은 1·3·6·12개월 기간을 제공하고, 현재 요금은 개발 테스트용으로만 사용하며 결제 요청은 즉시 성공 처리하고 회차 금액은 0원으로 기록합니다. 결제 대기(`PENDING`)·실패(`FAILED`) 회차 상태는 결제 연동을 위해 스키마에 남겨 두었습니다.

장소 서비스는 인증된 검색·상세·내 기록·좋아요·최근 본 장소·임시 장소 API와 화면 개발용 샘플 카탈로그를 제공합니다. 기록 사진은 data URL로 받아 DB에 저장하고, 응답에는 사진 주소만 담습니다. 비공개 기록 사진 주소에는 `PLACE_MEDIA_SIGNING_KEY`로 만든 만료 서명이 붙습니다. 커뮤니티 서비스는 프로필·이미지·취향·구독·포인트 조회·알림을 제공합니다. 두 서비스는 각자의 PostgreSQL DB를 JDBC로 조회하고 Flyway로 스키마를 관리합니다.

```text
kr.matdagong.community/
├─ profile/         # 프로필·이미지·취향 태그 API와 이미지 저장 서비스
├─ subscription/    # 구독 API·요금·회차 처리, 포인트 원장 조회
├─ notification/    # 알림함 API, 장소 서비스 기록 확인
└─ security/        # 공통 계정 토큰 검증

kr.matdagong.place/
├─ api/             # 장소·기록 API와 사진 응답
├─ application/     # 기록 저장·조회, 카카오 확인, 커뮤니티 프로필 조회, 사진 주소 서명
└─ security/        # 공통 계정 토큰 검증, 요청 본문 크기 제한
```

태그 추가 요청은 `taste_tag_requests`에 저장합니다. `POST /api/v1/taste-tags/requests`는 태그명·분류·사유를 접수하고, `GET /api/v1/taste-tags/requests/mine`은 로그인한 본인의 최근 20건을 반환합니다. 같은 사용자의 동일 태그 검토 대기 요청과 기존 목록에 있는 태그는 중복 접수하지 않습니다. 요청은 `PENDING`으로 시작하고 검토 결과·검토자·처리일을 보관합니다. 관리자 검토 화면과 승인 처리는 추후 관리자 서비스에서 구현합니다.

테스트는 저장소 루트에서 `.\gradlew.bat test`로 실행합니다. `PlaceRecordServiceIntegrationTest`는 embedded PostgreSQL에 장소 서비스 Flyway 스키마를 적용해 실제 SQL을 검증합니다.
