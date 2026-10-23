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
      ├─ matdagong-community-service/ # 맛객 프로필·다이어리·리뷰·구독
      └─ matdagong-place-service/     # 맛집·지도 조회
```

Gradle 멀티프로젝트 모노레포 안에서 각 백엔드 모듈은 별도의 Spring Boot 서버로 실행할 수 있습니다. 모듈별 책임은 업무 기능으로 나누고, 각 서비스 안에서는 `api → application → domain → infrastructure` 경계를 사용합니다.

## 로컬 실행

IntelliJ에서 저장소 루트를 Gradle 프로젝트로 열고 다음 세 백엔드를 각각 실행합니다.

```powershell
.\gradlew.bat :matdagong-api-gateway:bootRun
.\gradlew.bat :matdagong-community-service:bootRun
.\gradlew.bat :matdagong-place-service:bootRun
```

저장소 루트에서 PostgreSQL을 사용할 때는 `docker compose up -d postgres`로 개발 데이터베이스를 시작합니다. 공통 로그인 화면 개발 서버(4840)와 인증 API(5840)를 실행한 뒤, 맛다공 저장소 루트에서 `npm run dev`를 실행하고 `http://localhost:4845/`에 접속합니다. 로그인 테스트에는 `localhost`를 사용해야 PKCE 상태와 callback 주소가 같은 브라우저 origin으로 유지됩니다.

| 서버 | 기본 포트 | 책임 |
| --- | ---: | --- |
| dagong-auth React 화면 개발 서버 | 4840 | 공통 로그인 화면 |
| 맛다공 React 화면 개발 서버 | 4845 | 맛다공 사용자 화면 |
| dagong-auth API 서버 (별도 프로젝트) | 5840 | 공통 로그인과 계정 |
| dagong-point API (추후) | 5841 | 공통 포인트 |
| dagong-admin API (추후) | 5842 | 공통 관리자 |
| matdagong-api-gateway | 5843 | API 요청 전달 |
| matdagong-community-service | 5844 | 맛객 프로필과 사용자 활동 |
| matdagong-place-service | 5845 | 장소 검색과 상세 조회 |

Gateway는 `/api/v1/users`, `/api/v1/tasters`, `/api/v1/diary`, `/api/v1/subscriptions`, `/api/v1/notifications`를 커뮤니티 서비스로 전달하고 `/api/v1/places`를 장소 서비스로 전달합니다.

## 기능 상태

- 지도 화면은 장소 서비스의 `GET /api/v1/places?q={검색어}`와 `GET /api/v1/places/{id}` 샘플 API를 사용합니다. 현재 카탈로그는 코드에 있는 샘플 데이터이며 PostgreSQL 조회는 아직 연결되지 않았습니다.
- 스크랩·좋아요·구독·최근 본 장소·맛집 등록은 브라우저 `localStorage`에 저장됩니다. 서버 공유와 로그인 연동은 아직 연결되지 않았습니다.
- 맛다공 첫 진입은 공통 인증 서버에 Authorization Code + PKCE 로그인을 요청합니다. 로그인하지 않았다면 공통 로그인 화면으로 이동하고, 인증·동의가 끝나면 `/auth/callback`에서 코드를 교환한 뒤 맛다공 홈으로 돌아옵니다. 새 카카오 계정은 첫 인증 때 공통 계정으로 생성됩니다.
- 포인트 서버와 관리자 화면은 현재 실행 모듈에 포함하지 않습니다. 포인트 원장·거래 규칙과 관리자 업무가 구체화되면 별도 서비스 또는 화면으로 추가합니다.

## 화면과 도메인 문서

- [프런트엔드 구조](docs/frontend-structure.md)
- [도메인 및 API 경계](docs/api-boundaries.md)
- [카카오 지도 설정](docs/kakao-map-setup.md)
- [포인트 보안 원칙 초안](docs/point-security.md)
