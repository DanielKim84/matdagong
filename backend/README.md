# 백엔드 서비스

`matdagong-common`을 뺀 각 Gradle 모듈은 독립 실행 가능한 Spring Boot 서버입니다.

- 서비스끼리 코드는 직접 참조하지 않습니다. 함께 쓰는 토큰 검증·주소 허용 정책·ProblemDetail 오류 응답·RestClient 생성·이미지 형식 검사·JDBC 도우미·취향 태그 분류는 `matdagong-common` 라이브러리(실행 서버 아님)에서 가져옵니다.
- 브라우저 요청은 API Gateway가 버전이 있는 HTTP 경로로 전달합니다. Gateway의 `ActiveLoginFilter`는 요청마다 그 토큰이 아직 로그인 중인지 공통 인증 서버에 물어(토큰별 30초 기억), 다른 기기 로그인·로그아웃·탈퇴로 끝난 토큰을 401로 막습니다.
- 서비스끼리 확인이 필요할 때는 Gateway를 거치지 않고 상대 서비스 API를 직접 호출합니다.

```text
matdagong-api-gateway       :5843
├─ /api/v1/places/**, /media/place-record-photos/**, /media/place-menu-photos/**
│                            → matdagong-place-service       :5845  (요청 본문 최대 30MB)
└─ /api/v1/{users,tasters,taste-tags,subscriptions,notifications,points}/**, /media/profiles/**
                             → matdagong-community-service   :5844  (요청 본문 최대 55MB)

matdagong-place-service ──GET /api/v1/users/me/profile──→ matdagong-community-service   (COMMUNITY_SERVICE_URL, 사용자 토큰)
matdagong-place-service ──GET /internal/v1/hidden-tasters─→ matdagong-community-service (30초마다, 게이트웨이 경로 밖)
matdagong-community-service ──GET /api/v1/places/{id}──→ matdagong-place-service       (PLACE_SERVICE_URL, 사용자 토큰)
```

호출마다 하는 일은 [도메인 및 API 경계](../docs/api-boundaries.md#현재-흐름)에 있습니다. 사용자 토큰을 싣는 두 호출은 DB 트랜잭션 밖에서 먼저 끝냅니다.

## 데이터베이스

- 각 도메인 서비스는 자체 데이터베이스를 소유하며 다른 서비스의 테이블을 직접 조회하지 않습니다.
- 커뮤니티 서비스는 `COMMUNITY_DB_*`, 장소 서비스는 `PLACE_DB_*` 접속 설정을 씁니다. 기본값은 `docker-compose.yml`의 로컬 PostgreSQL에 있는 `matdagong_community`, `matdagong_places` DB입니다(개발 PC 설정은 [개발 환경 설정](../docs/home-development-setup.md)).
- 사용자의 공통 로그인 ID와 계정 상태는 `dagong-auth`가 소유하고, 각 맛다공 서비스는 공통 계정 UUID를 값으로만 저장합니다(인증 DB와 외래 키 없음).
- 스키마는 Flyway SQL이 관리합니다: 커뮤니티 `backend/matdagong-community-service/src/main/resources/db/migration`, 장소 `backend/matdagong-place-service/src/main/resources/db/migration`. 적용된 마이그레이션은 공유 개발 DB의 체크섬과 맞아야 하므로 고치지 않고 새 버전으로 바꿉니다.
- 테이블별 역할은 [커뮤니티 DB의 주요 테이블](../docs/api-boundaries.md#커뮤니티-db의-주요-테이블), [장소 DB의 주요 테이블](../docs/api-boundaries.md#장소-db의-주요-테이블)에 한 곳으로 모아 둡니다.
- 화면 개발용 더미 계정·샘플 장소는 커뮤니티 V40·장소 V15에서 모두 지웠고 시드 SQL도 두지 않습니다. 시험용 데이터가 필요하면 실제 사용자처럼 기존 테이블에 넣습니다.

## 서비스가 제공하는 것

- **장소 서비스**: 인증된 검색·상세, 내 기록(작성·수정·공개 범위·지우기), 하트(가볼 곳)·다녀온 곳·별로였던 곳, 경험 신뢰 재료, 최근 본 장소, 빠른 저장, 가볼 곳 저장(카카오 가게), 가게 정보 제보, 탈퇴 데이터 삭제.
  - 기록 사진은 data URL로 받아 DB에 저장하고, 응답에는 사진 주소만 담습니다. 비공개 기록 사진 주소에는 `PLACE_MEDIA_SIGNING_KEY`로 만든 만료 서명이 붙습니다.
- **커뮤니티 서비스**: 프로필·이미지·취향·맛객 목록·구독·포인트 조회·알림·태그 제안·맛객 신고.
- 두 서비스는 각자의 PostgreSQL DB를 JDBC로 조회합니다.

**구독**: 무료 구독은 사용자당 한 명까지 유지하며 새 무료 구독을 신청하면 기존 무료 구독을 끝냅니다. 유료 구독은 1·3·6·12개월이고, 지금 요금은 개발 테스트용이라 결제 요청을 바로 성공 처리하고 회차 금액은 0원으로 기록합니다. 결제 대기(`PENDING`)·실패(`FAILED`) 회차 상태는 결제 연동을 위해 스키마에 남겨 두었습니다.

**태그 추가 요청**: `taste_tag_requests`에 저장합니다.

- `POST /api/v1/taste-tags/requests`는 태그명·분류·사유를 받고, `GET /api/v1/taste-tags/requests/mine`은 본인의 최근 20건을 돌려줍니다.
- 같은 사용자의 같은 태그 검토 대기 요청과 이미 목록에 있는 태그는 다시 받지 않습니다.
- 요청은 `PENDING`으로 시작하고 검토 결과·검토자·처리일을 보관합니다. 관리자 검토 화면과 승인 처리는 추후 관리자 서비스에서 만듭니다.

## 패키지

```text
kr.matdagong.common/          # (matdagong-common) 서비스 공통 코드
├─ security/        # access token 검증(JwtDecoder·audience), 계정 ID 추출, 허용 목록 주소 정책
├─ web/             # ProblemDetail 오류 응답 기반(ApiExceptionHandlerSupport), 공통 오류 문구
├─ http/            # 시간 제한을 둔 RestClient 생성
├─ media/           # 이미지 머리 바이트 검사
├─ jdbc/            # timestamptz 읽기(JdbcTimes), 배열 칼럼 읽기(JdbcArrays), LIKE 검색어 이스케이프(LikePatterns)
└─ tag/             # 취향 태그 분류(CUISINE·TASTE·CAFE·DESSERT·TRAVEL·MOOD·OCCASION·VISIT)와 분류별 고를 수 있는 수
                    # testFixtures: EmbeddedPostgresTestSupport(DB 통합 테스트 지원)

kr.matdagong.gateway/         # (matdagong-api-gateway) 경로 전달, 로그인 중인 토큰 확인(ActiveLoginFilter)

kr.matdagong.community/
├─ profile/         # 내 프로필·프로필 사진·배경 갤러리, 탈퇴(DELETE /api/v1/users/me)
├─ tastetag/        # 취향 태그 목록, 태그 추가 제안
├─ taster/          # 맛객 목록과 취향 일치율(TasteMatch), 경험 신뢰(TasteTrust)
├─ subscription/    # 구독 API·요금·회차 처리
├─ point/           # 포인트 원장 조회
├─ notification/    # 알림함·알림 설정 API, 장소 서비스 기록 확인
├─ report/          # 맛객 신고, 신고 누적 처리, 가린 맛객 목록(/internal/v1/hidden-tasters)
└─ security/        # 토큰 검증과 공개 주소(/media/profiles/**) 설정

kr.matdagong.place/
├─ catalog/         # 장소 검색·상세, 장소 응답 조립(PlaceViewLoader)
├─ record/          # 맛집 기록 저장·수정·지우기·공개 범위, 하트→기록 전환
├─ draft/           # 빠른 저장(나중에 이어 쓸 장소)
├─ like/            # 하트(가볼 곳), 별로였던 곳, 방문 근거(visit-proofs)
├─ visit/           # 다녀온 곳(빠른 저장·기록한 적 있는 곳)
├─ wish/            # 카카오 가게를 가볼 곳으로 저장
├─ trust/           # 경험 신뢰 재료(인정·엇갈림·태그 일치)
├─ location/        # 기기 위치가 가게 1km 안인지 확인(NearbyPlaceGuard)
├─ recent/          # 최근 본 장소(15일·30곳)
├─ report/          # 가게 정보 제보
├─ account/         # 탈퇴 때 내 장소 데이터 지우기
├─ media/           # 기록·메뉴 사진 응답, 사진 해석, 비공개 사진 주소 서명
├─ kakao/           # 카카오 Local API 가게 정보 확인
├─ profile/         # 커뮤니티 서비스의 작성자 프로필 조회, 가린 맛객 목록 받기
└─ security/        # 토큰 검증과 공개 사진 주소 설정, 요청 본문 크기 제한
```

기능 패키지 안의 Controller·Service·`XxxModels` 역할과 오류 응답 규칙은 [코딩 스타일 · Java](../docs/coding-style.md#5-java-backend)를 따릅니다. 서비스마다 하나인 `@RestControllerAdvice`는 `CommunityExceptionHandler`, `PlaceExceptionHandler`이고, `@Valid` 실패는 record 애너테이션의 `message`를, 없으면 공통 안내를 씁니다.

## 테스트

저장소 루트에서 `.\gradlew.bat test`로 실행합니다. DB 테스트(`*IntegrationTest`)는 `matdagong-common`의 `EmbeddedPostgresTestSupport`를 상속해 테스트 클래스마다 embedded PostgreSQL을 한 번 띄우고 그 서비스의 Flyway 스키마를 적용한 뒤, 테스트마다 쓰는 테이블을 TRUNCATE합니다. Docker나 개발 DB는 필요 없습니다. DB가 필요 없는 단위 테스트는 `*Test`입니다.
