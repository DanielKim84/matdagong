# 맛다공

React 사용자 화면과 독립 배포 가능한 Spring Boot 서비스로 구성한 맛집 공유 앱입니다. 공통 로그인과 계정은 별도 프로젝트인 `dagong-auth`가 맡고, 맛다공은 인증된 공통 계정 ID를 서비스 API에서 사용합니다.

## 프로젝트 구성

```text
C:\workspace\
├─ dagong-auth/                 # 맛다공·여다공 공통 로그인과 계정
└─ dagong-matdagong/            # 맛다공 서비스 모노레포
   ├─ frontend/                 # React 사용자 화면
   └─ backend/
      ├─ matdagong-api-gateway/ # 프런트 요청의 단일 진입점
      ├─ matdagong-community-service/ # 맛객 프로필·취향·구독·포인트·알림
      └─ matdagong-place-service/     # 맛집·맛객별 기록·지도 조회
```

Gradle 멀티프로젝트 모노레포 안에서 각 백엔드 모듈은 별도의 Spring Boot 서버로 실행합니다. 커뮤니티는 `profile`, `subscription` 같은 기능별 패키지로 나누고 컨트롤러가 HTTP 요청을, 서비스가 처리 규칙과 DB 작업을 맡습니다.

## 로컬 실행

IntelliJ에서 저장소 루트를 Gradle 프로젝트로 열고 다음 세 백엔드를 각각 실행합니다.

Java 21과 Node.js 24.22.1 이상(24 LTS 계열)을 사용합니다. 프런트 패키지는 최초 실행 전에 `frontend` 폴더에서 `npm ci`로 설치합니다.

```powershell
.\gradlew.bat :matdagong-api-gateway:bootRun
.\gradlew.bat :matdagong-community-service:bootRun
.\gradlew.bat :matdagong-place-service:bootRun
```

커뮤니티 서비스는 루트 `.env`의 `COMMUNITY_DB_*`, 장소 서비스는 `PLACE_DB_*` 설정으로 각각 별도 개발 DB에 연결합니다. 로컬 PostgreSQL을 별도로 사용할 때는 `docker compose up -d postgres`로 시작하고 각 DB 접속 설정을 로컬 DB로 맞춥니다. 스키마는 서비스별 Flyway가 적용합니다. 공통 로그인 화면 개발 서버(4840)와 인증 API(5840)를 실행한 뒤, 맛다공 저장소 루트에서 `npm run dev`를 실행하고 `http://localhost:4845/`에 접속합니다. 로그인 테스트에는 `localhost`를 사용해야 PKCE 상태와 callback 주소가 같은 브라우저 origin으로 유지됩니다.

두 서비스는 루트 `.env`에서 다음 값도 읽습니다. 값의 형식은 `.env.example`을 참고합니다.

| 설정 | 사용하는 서비스 | 설명 |
| --- | --- | --- |
| `COMMUNITY_SERVICE_URL` | 장소 서비스, Gateway | 기록 작성자 닉네임·캐릭터를 커뮤니티 프로필(`GET /api/v1/users/me/profile`)에서 직접 조회합니다. 기본값 `http://localhost:5844` |
| `PLACE_SERVICE_URL` | 커뮤니티 서비스, Gateway | 맛집 등록 알림을 만들기 전에 장소 서비스에 저장된 본인 기록을 직접 확인합니다. 기본값 `http://localhost:5845` |
| `KAKAO_REST_API_KEY` | 장소 서비스 | 가게 기본정보를 카카오 Local API로 다시 확인합니다. 비우면 확인하지 않습니다. 자세한 내용은 [카카오 지도 설정](docs/kakao-map-setup.md)을 참고합니다. |
| `PLACE_MEDIA_SIGNING_KEY` | 장소 서비스 | 비공개 기록 사진 주소의 HMAC 서명 키입니다. 비우면 재시작할 때마다 바뀌어 이전에 받은 비공개 사진 주소가 열리지 않습니다. |

Gateway는 `.env`를 읽지 않으므로 서비스 주소를 바꿀 때는 Gateway 실행 환경 변수로 지정합니다.

백엔드 테스트는 저장소 루트에서 실행합니다. 장소 서비스의 DB 통합 테스트는 embedded PostgreSQL로 Flyway 스키마를 적용하므로 Docker나 개발 DB가 필요하지 않습니다.

```powershell
.\gradlew.bat test
```

| 서버 | 기본 포트 | 책임 |
| --- | ---: | --- |
| dagong-auth React 화면 개발 서버 | 4840 | 공통 로그인 화면 |
| 맛다공 React 화면 개발 서버 | 4845 | 맛다공 사용자 화면 |
| dagong-auth API 서버 (별도 프로젝트) | 5840 | 공통 로그인과 계정 |
| dagong-point API (추후) | 5841 | 공통 포인트 |
| dagong-admin API (추후) | 5842 | 공통 관리자 |
| matdagong-api-gateway | 5843 | API 요청 전달 |
| matdagong-community-service | 5844 | 맛객 프로필·취향·구독·포인트·알림 |
| matdagong-place-service | 5845 | 장소 검색·상세, 맛객별 기록·사진, 하트, 최근 본 장소 |

Gateway는 `/api/v1/users`, `/api/v1/tasters`, `/api/v1/taste-tags`, `/api/v1/subscriptions`, `/api/v1/notifications`, `/api/v1/points`와 `/media/profiles/**`를 커뮤니티 서비스로, `/api/v1/places`와 `/media/place-record-photos/**`, `/media/place-menu-photos/**`를 장소 서비스로 전달합니다. 요청 본문은 커뮤니티 55MB(프로필·배경 사진 multipart), 장소 30MB(base64 사진이 담긴 기록 JSON)까지 받으며, 장소 서비스는 Gateway를 거치지 않은 요청도 같은 한도로 막습니다.

## 기능 상태

- 지도 화면은 장소 서비스의 인증된 검색·상세 API를 사용합니다. 화면 개발용 샘플 장소는 계속 제공하며, 카카오 장소를 선택해 저장한 장소와 맛객별 추천 이유·메뉴·태그·방문 조건·사진은 별도 장소 DB에 저장합니다. 한 장소에 여러 맛객의 기록을 연결하고 공개 기록은 지도와 상세에 함께 표시합니다. 비공개 기록은 작성자에게만 보이며, 좋아요와 최근 본 장소(15일, 최대 30곳)도 계정별로 서버에 저장합니다.
- 기록 작성자 이름·캐릭터는 요청 본문이 아니라 커뮤니티 프로필에서 가져옵니다. 여러 맛객이 함께 쓰는 가게 기본정보는 카카오 Local API로 확인된 값일 때만 갱신하고, 확인하지 못하면 새 가게일 때만 요청 값으로 저장합니다.
- 기록 사진과 메뉴 사진은 응답 JSON에 넣지 않고 `/media/...` 주소로 내려줍니다. 공개 기록 사진은 누구나 열 수 있고, 비공개 기록 사진은 작성자에게만 만료 시각과 서명이 붙은 주소로 제공합니다.
- 프로필·배경 이미지, 소개, 공개 태그·비공개 취향, 무료·유료 구독과 포인트 내역은 커뮤니티 API와 DB에 저장합니다. 배경 사진은 맛객마다 최대 10장까지 등록합니다. 유료 구독은 1·3·6·12개월 개발 요금을 표시하고 실제 결제 없이 즉시 완료하며, 회차 금액은 0원으로 기록합니다. 포인트 화면은 원장 내역을 조회하며, 구독 리워드 지급 규칙은 아직 연결되지 않았습니다.
- 알림은 서버가 만듭니다. 화면은 맛집 등록 뒤 장소 ID만 보내고, 커뮤니티 서비스가 장소 서비스에서 본인 기록을 확인해 등록 완료 알림과(공개 기록이면) 구독자 알림을 저장합니다. 새 구독자 알림은 구독 신청 시 만들어지며, 알림은 90일 뒤 정리됩니다.
- 맛다공 첫 진입은 공통 인증 서버에 Authorization Code + PKCE 로그인을 요청합니다. 로그인하지 않았다면 공통 로그인 화면으로 이동하고, 인증·동의가 끝나면 `/auth/callback`에서 코드를 교환한 뒤 맛다공 홈으로 돌아옵니다. 새 카카오 계정은 첫 인증 때 공통 계정으로 생성됩니다.
- 포인트 원장과 조회 API는 커뮤니티 서비스에 있습니다. 포인트 정산·교환과 관리자 업무는 운영 정책이 확정된 뒤 별도로 설계합니다.

## 화면과 도메인 문서

- [프런트엔드 구조](docs/frontend-structure.md)
- [도메인 및 API 경계](docs/api-boundaries.md)
- [카카오 지도 설정](docs/kakao-map-setup.md)
- [포인트 보안 원칙 초안](docs/point-security.md)
