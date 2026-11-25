# 백엔드

맛다공 API는 `matdagong-api` 하나로 실행합니다(포트 4845). 장소·커뮤니티는 그 안에서 도는 기능 모듈입니다.

| Gradle 모듈 | 하는 일 | 실행 jar |
| --- | --- | --- |
| `matdagong-api` | 서버 시작점(`kr.matdagong.MatdagongApplication`), 보안(`SecurityConfig`), 오류 응답(`ApiExceptionHandler`), 로그인 중인 토큰 확인(`ActiveLoginFilter`), 탈퇴(`WithdrawalController`), 설정(`application.yml`) | 예 |
| `matdagong-place` | 장소 모듈 — 맛집·기록·하트·다녀온 곳·별로였던 곳·빠른 저장·최근 본 곳·제보, 장소 DB | 아니요 |
| `matdagong-community` | 커뮤니티 모듈 — 프로필·취향·맛객 목록·구독·알림·태그 제안·맛객 신고, 커뮤니티 DB | 아니요 |
| `matdagong-common` | 공통 코드 — 토큰 검증·주소 허용 정책·ProblemDetail 오류 응답·RestClient 생성·이미지 형식 검사·JDBC 도우미·취향 태그 분류, 두 모듈이 서로 묻는 인터페이스(`module` 패키지) | 아니요 |

- **모듈 경계**: 장소·커뮤니티 모듈은 서로의 코드를 직접 부르지 않습니다(Gradle 의존도 없음). 장소 모듈이 맛객 정보를 물을 때는 `TasterDirectory`(커뮤니티가 구현), 커뮤니티 모듈이 기록 정보를 물을 때는 `PlaceDirectory`(장소가 구현)를 씁니다. 두 모듈에 걸친 것(탈퇴처럼 둘 다 지워야 하는 것)만 `matdagong-api`에 둡니다.
- **로그인 확인**: `ActiveLoginFilter`가 `/api/v1/**` 요청마다 그 토큰이 아직 로그인 중인지 공통 인증 서버에 물어(토큰별 30초 기억), 다른 기기 로그인·로그아웃·탈퇴로 끝난 토큰을 401로 막습니다. 토큰 서명은 `SecurityConfig`가 확인합니다.
- **요청 크기**: 사진 올리기(multipart, 프로필·배경)는 `spring.servlet.multipart` 55MB, 장소 API(`/api/v1/places/**`, base64 사진이 담긴 기록 JSON)는 `RequestSizeLimitFilter` 30MB까지 받습니다.
- 2026-11-25 이전에는 게이트웨이·커뮤니티·장소 서버 세 개(옛 포트 5843·5844·5845)였습니다. 두 서비스가 늘 서로를 불러 장애 격리의 의미가 없어 한 서버로 합쳤고, 서비스 사이 HTTP 호출(`/internal/v1/hidden-tasters`, 신뢰 재료 `/api/v1/places/trust-stats` 등)은 모듈 인터페이스 호출로 바뀌었습니다.

```text
브라우저 ─/api/v1/**, /media/**─→ matdagong-api :4845
                                  ├─ 장소 모듈  (/api/v1/places/**, /media/place-record-photos/**, /media/place-menu-photos/**) → 장소 DB
                                  ├─ 커뮤니티 모듈 (/api/v1/{users,tasters,taste-tags,subscriptions,notifications}/**, /media/profiles/**) → 커뮤니티 DB
                                  └─ 탈퇴 DELETE /api/v1/users/me → 장소 데이터 → 커뮤니티 데이터 순서로 지움

장소 모듈 ──TasterDirectory──→ 커뮤니티 모듈   (기록 작성자 프로필, 신고로 가려진 맛객)
커뮤니티 모듈 ──PlaceDirectory──→ 장소 모듈     (맛집 등록 알림 전 본인 기록 확인, 맛객 신뢰 재료)
```

호출마다 하는 일은 [도메인 및 API 경계](../docs/api-boundaries.md#현재-흐름)에 있습니다. 다른 모듈 DB를 읽는 호출은 자기 DB 트랜잭션에 들어가기 전에 컨트롤러에서 먼저 끝냅니다.

## 데이터베이스

- 장소 모듈은 장소 DB(`PLACE_DB_*`), 커뮤니티 모듈은 커뮤니티 DB(`COMMUNITY_DB_*`)를 따로 씁니다. 다른 모듈 DB의 테이블은 직접 조회하지 않고 모듈 인터페이스로 묻습니다. 개발 PC는 루트 `.env`에 설정한 공유 Neon DB를 사용합니다([개발 환경 설정](../docs/home-development-setup.md)).
- DB가 둘이라 Spring Boot의 단일 DB 자동 설정은 끄고(`application.yml`), 모듈마다 연결·트랜잭션·Flyway를 직접 만듭니다(`PlaceDatabaseConfig`·`CommunityDatabaseConfig`). 모듈 코드는 `@PlaceDatabase`·`@CommunityDatabase`가 붙은 `JdbcTemplate`만 주입받고, 트랜잭션도 `@Transactional(transactionManager = PlaceDatabase.TRANSACTIONS)`처럼 자기 DB 것을 엽니다.
- 사용자의 공통 로그인 ID와 계정 상태는 `dagong-auth`가 소유하고, 맛다공은 공통 계정 UUID를 값으로만 저장합니다(인증 DB와 외래 키 없음).
- 스키마는 Flyway SQL이 관리합니다: 장소 `backend/matdagong-place/src/main/resources/db/migration/place`, 커뮤니티 `backend/matdagong-community/src/main/resources/db/migration/community`. 한 서버에서 두 폴더가 섞이지 않게 나눠 두었습니다(파일 내용은 그대로라 체크섬은 같음). 적용된 마이그레이션은 공유 개발 DB의 체크섬과 맞아야 하므로 고치지 않고 새 버전으로 바꿉니다.
- 테이블별 역할은 [커뮤니티 DB의 주요 테이블](../docs/api-boundaries.md#커뮤니티-db의-주요-테이블), [장소 DB의 주요 테이블](../docs/api-boundaries.md#장소-db의-주요-테이블)에 한 곳으로 모아 둡니다.
- 화면 개발용 더미 계정·샘플 장소는 커뮤니티 V40·장소 V15에서 모두 지웠고 시드 SQL도 두지 않습니다. 시험용 데이터가 필요하면 실제 사용자처럼 기존 테이블에 넣습니다.
- 포인트 원장(`user_point_history`)은 적립·사용 처리 없이 조회만 있어 커뮤니티 V46에서 지웠습니다. 포인트는 다공 공통 포인트 서버로 새로 만듭니다([포인트 원장 기준](../docs/point-security.md)).

## 모듈이 제공하는 것

- **장소 모듈**: 인증된 검색·상세, 내 기록(작성·수정·공개 범위·지우기), 하트(가볼 곳)·다녀온 곳·별로였던 곳, 최근 본 장소, 빠른 저장, 가볼 곳 저장(카카오 가게), 가게 정보 제보, 탈퇴 때 장소 데이터 삭제, 커뮤니티 모듈에 주는 본인 기록·경험 신뢰 재료(`PlaceDirectoryAdapter`).
  - 기록 사진은 data URL로 받아 DB에 저장하고, 응답에는 사진 주소만 담습니다. 비공개 기록 사진 주소에는 `PLACE_MEDIA_SIGNING_KEY`로 만든 만료 서명이 붙습니다.
- **커뮤니티 모듈**: 프로필·이미지·취향·맛객 목록·구독·알림·태그 제안·맛객 신고, 탈퇴 때 커뮤니티 데이터 삭제, 장소 모듈에 주는 작성자 프로필·가려진 맛객(`TasterDirectoryAdapter`).

**구독**: 무료 구독은 사용자당 한 명까지 유지하며 새 무료 구독을 신청하면 기존 무료 구독을 끝냅니다. 유료 구독은 1·3·6·12개월이고, 지금 요금은 개발 테스트용이라 결제 요청을 바로 성공 처리하고 회차 금액은 0원으로 기록합니다(화면은 유료 구독을 "준비 중"으로 막아 둠). 결제 대기(`PENDING`)·실패(`FAILED`) 회차 상태는 결제 연동을 위해 스키마에 남겨 두었습니다.

**태그 추가 요청**: `taste_tag_requests`에 저장합니다.

- `POST /api/v1/taste-tags/requests`는 태그명·분류·사유를 받고, `GET /api/v1/taste-tags/requests/mine`은 본인의 최근 20건을 돌려줍니다.
- 같은 사용자의 같은 태그 검토 대기 요청과 이미 목록에 있는 태그는 다시 받지 않습니다.
- 요청은 `PENDING`으로 시작하고 검토 결과·검토자·처리일을 보관합니다. 관리자 검토 화면과 승인 처리는 추후 관리자 서비스에서 만듭니다.

## 패키지

```text
kr.matdagong.MatdagongApplication  # (matdagong-api) 서버 시작점
kr.matdagong.api/               # (matdagong-api) 보안, 오류 응답, 로그인 확인(ActiveLoginFilter), 탈퇴

kr.matdagong.common/               # (matdagong-common) 공통 코드
├─ module/          # 두 모듈이 서로 묻는 인터페이스: TasterDirectory(커뮤니티가 구현), PlaceDirectory(장소가 구현)
├─ security/        # access token subject에서 계정 ID 꺼내기(AuthenticatedAccount)
├─ web/             # 공통 오류 문구(ApiErrors)
├─ http/            # 시간 제한을 둔 RestClient 생성(인증 서버·카카오 호출)
├─ media/           # 이미지 머리 바이트 검사
├─ jdbc/            # timestamptz 읽기(JdbcTimes), 배열 칼럼 읽기(JdbcArrays), LIKE 검색어 이스케이프(LikePatterns)
├─ text/            # 글자 다듬기(Texts)
└─ tag/             # 취향 태그 분류(CUISINE·TASTE·CAFE·DESSERT·TRAVEL·MOOD·OCCASION·VISIT)와 분류별 고를 수 있는 수
                    # testFixtures: EmbeddedPostgresTestSupport(DB 통합 테스트 지원), SchemaDocumentation

kr.matdagong.community/            # (matdagong-community)
├─ CommunityDatabase(Config)  # 커뮤니티 DB 연결·트랜잭션·Flyway
├─ TasterDirectoryAdapter     # 장소 모듈에 주는 맛객 정보
├─ profile/         # 내 프로필·프로필 사진·배경 갤러리, 탈퇴 때 커뮤니티 데이터 지우기(WithdrawalService)
├─ tastetag/        # 취향 태그 목록, 태그 추가 제안
├─ taster/          # 맛객 목록과 취향 일치율(TasteMatch), 경험 신뢰(TasteTrust)
├─ subscription/    # 구독 API·요금·회차 처리
├─ notification/    # 알림함·알림 설정 API, 맛집 등록 알림(장소 모듈에서 본인 기록 확인)
└─ report/          # 맛객 신고, 신고 누적 처리, 가린 맛객 목록

kr.matdagong.place/                # (matdagong-place)
├─ PlaceDatabase(Config)      # 장소 DB 연결·트랜잭션·Flyway
├─ PlaceDirectoryAdapter      # 커뮤니티 모듈에 주는 본인 기록·경험 신뢰 재료
├─ catalog/         # 장소 검색·상세, 장소 응답 조립(PlaceViewLoader)
├─ record/          # 맛집 기록 저장·수정·지우기·공개 범위(하트한 곳을 기록하면 하트를 지움)
├─ draft/           # 빠른 저장(나중에 이어 쓸 장소)
├─ like/            # 하트(가볼 곳), 별로였던 곳(방문 근거 확인)
├─ visit/           # 다녀온 곳(빠른 저장·기록한 적 있는 곳)
├─ wish/            # 카카오 가게를 가볼 곳으로 저장
├─ trust/           # 경험 신뢰 재료(인정·엇갈림·태그 일치)
├─ location/        # 기기 위치가 가게 1km 안인지 확인(NearbyPlaceGuard)
├─ recent/          # 최근 본 장소(15일·30곳)
├─ report/          # 가게 정보 제보
├─ account/         # 탈퇴 때 내 장소 데이터 지우기(AccountDataService)
├─ media/           # 기록·메뉴 사진 응답, 사진 해석, 비공개 사진 주소 서명
├─ kakao/           # 카카오 Local API 가게 정보 확인
├─ profile/         # 작성자 프로필 확인(AuthorProfiles), 가린 맛객 ID(HiddenTasters) — 둘 다 TasterDirectory로 읽음
└─ security/        # 장소 API 요청 본문 크기 제한(RequestSizeLimitFilter)
```

기능 패키지 안의 Controller·Service·`XxxModels` 역할과 오류 응답 규칙은 [코딩 스타일 · Java](../docs/coding-style.md#5-java-backend)를 따릅니다. `@RestControllerAdvice`는 서버에 하나(`ApiExceptionHandler`)이고, `@Valid` 실패는 record 애너테이션의 `message`를, 없으면 공통 안내를 씁니다.

## 테스트

저장소 루트에서 `.\gradlew.bat test`로 실행합니다. DB 테스트(`*IntegrationTest`)는 `matdagong-common`의 `EmbeddedPostgresTestSupport`를 상속해 테스트 클래스마다 embedded PostgreSQL을 한 번 띄우고 그 모듈의 Flyway 스키마(`classpath:db/migration` 아래, 모듈마다 자기 폴더만 있음)를 적용한 뒤, 테스트마다 쓰는 테이블을 TRUNCATE합니다. Docker나 개발 DB는 필요 없습니다. DB가 필요 없는 단위 테스트는 `*Test`이고, 다른 모듈 대신 정해 둔 값을 돌려주는 모듈 인터페이스 구현을 넣어 시험합니다(`TestHiddenTasters` 등).
