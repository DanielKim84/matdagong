# 맛다공

React 사용자 화면과 Spring Boot API 서버 하나로 구성한 맛집 공유 앱입니다. 공통 로그인과 계정은 별도 프로젝트인 `dagong-auth`가 맡고, 맛다공은 인증된 공통 계정 ID를 API에서 사용합니다.

기획·디자인 검토 자료는 [UI 시안 자료](docs/ui/proposals/README.md)에 있습니다. 최신 브랜드 A를 반영한 18개 보드·72개 화면/주요 상태와 HTML 열람본·PDF를 담고 있으며, 지금 앱 화면은 이 보드대로 맞춰져 있습니다.

## 프로젝트 구성

```text
C:\workspace\
├─ dagong-auth/                 # 맛다공·여다공 공통 로그인과 계정
└─ dagong-matdagong/            # 맛다공 모노레포
   ├─ frontend/                 # React 사용자 화면
   └─ backend/
      ├─ matdagong-api/      # 맛다공 API 서버(실행 jar). 보안·오류 응답·로그인 확인·탈퇴
      ├─ matdagong-place/       # 장소 모듈: 맛집·맛객별 기록·지도 조회·하트·제보
      ├─ matdagong-community/   # 커뮤니티 모듈: 맛객 프로필·취향·구독·알림·신고
      └─ matdagong-common/      # 공통 코드(토큰 검증, 오류 응답, 두 모듈이 서로 묻는 인터페이스 등)
```

맛다공 API는 `matdagong-api` 하나로 실행합니다. 장소·커뮤니티는 그 안에서 도는 기능 모듈(Gradle 모듈)이고, 서로의 코드를 직접 부르지 않고 `matdagong-common`의 `module` 인터페이스(`TasterDirectory`·`PlaceDirectory`)로만 주고받습니다. 모듈 안은 `profile`, `subscription` 같은 기능별 패키지로 나누고 컨트롤러가 HTTP 요청을, 서비스가 처리 규칙과 DB 작업을 맡습니다. 2026-11-25 이전에는 게이트웨이·커뮤니티·장소 서버 세 개였지만, 두 모듈이 늘 서로를 불러 장애 격리의 의미가 없어 하나로 합쳤습니다.

## 로컬 실행

> 새 PC(집 PC 등)에서 처음부터 똑같이 맞출 때는 **[개발 환경 설정 통합 안내](docs/home-development-setup.md)** 하나만 따르면 됩니다. 공통 인증 서버 설정까지 포함합니다.

Java 21과 Node.js 24.22.1 이상(24 LTS 계열)을 사용합니다. 프런트 패키지는 최초 실행 전에 `frontend` 폴더에서 `npm ci`로 설치합니다. IntelliJ에서 저장소 루트를 Gradle 프로젝트로 열고 맛다공 서버를 실행합니다.

```powershell
.\gradlew.bat :matdagong-api:bootRun
```

맛다공 서버는 루트 `.env`의 `PLACE_DB_*`로 장소 DB에, `COMMUNITY_DB_*`로 커뮤니티 DB에 따로 연결합니다(공유 Neon DB, 로컬 PostgreSQL·Docker 설정은 두지 않음). 스키마는 모듈마다 자기 DB에 Flyway로 적용합니다(장소 `db/migration/place`, 커뮤니티 `db/migration/community`). 공통 로그인 화면 개발 서버(5840)와 인증 API(4840)를 실행한 뒤, 맛다공 저장소 루트에서 `npm run dev`를 실행하고 `http://localhost:5845/`에 접속합니다. 로그인 테스트에는 `localhost`를 사용해야 PKCE 상태와 callback 주소가 같은 브라우저 origin으로 유지됩니다.

맛다공 서버는 루트 `.env`에서 다음 값도 읽습니다. 값의 형식은 `.env.example`을 참고합니다.

| 설정 | 설명 |
| --- | --- |
| `KAKAO_REST_API_KEY` | 가게 기본정보를 카카오 Local API로 다시 확인합니다. 비우면 확인하지 않습니다. 자세한 내용은 [카카오 지도 설정](docs/kakao-map-setup.md)을 참고합니다. |
| `PLACE_MEDIA_SIGNING_KEY` | 비공개 기록 사진 주소의 HMAC 서명 키입니다. 비우면 재시작할 때마다 바뀌어 이전에 받은 비공개 사진 주소가 열리지 않습니다. |

백엔드 테스트는 저장소 루트에서 실행합니다. DB 통합 테스트는 embedded PostgreSQL로 Flyway 스키마를 적용하므로 Docker나 개발 DB가 필요하지 않습니다.

```powershell
.\gradlew.bat test
```

포트는 운영에서도 도는 API 서버가 48xx, 개발 때만 쓰는 화면 서버(Vite)가 58xx입니다. 끝자리가 같으면 같은 서비스입니다(4840 인증 API ↔ 5840 로그인 화면, 4845 맛다공 API ↔ 5845 맛다공 화면).

| 서버 | 기본 포트 | 책임 |
| --- | ---: | --- |
| dagong-auth API 서버 (별도 프로젝트) | 4840 | 공통 로그인과 계정 |
| dagong-point API (추후) | 4841 | 다공 공통 포인트(맛다공·여다공이 함께 씀) |
| dagong-admin API (추후) | 4842 | 다공 공통 관리자(계정·포인트·서비스별 신고·제보 처리) |
| matdagong-api | 4845 | 맛다공 API 전체(장소·커뮤니티 모듈) |
| dagong-auth React 화면 개발 서버 | 5840 | 공통 로그인 화면(개발용) |
| 맛다공 React 화면 개발 서버 | 5845 | 맛다공 사용자 화면(개발용, `/api`·`/media`를 4845로 넘김) |

경로와 모듈 구성은 [백엔드](backend/README.md)에 있습니다. 요청 본문은 사진 올리기(multipart) 55MB, 장소 기록 JSON(base64 사진 포함) 30MB까지 받습니다.

## 기능 상태

- 지도 화면은 장소 모듈의 인증된 검색·상세 API를 사용합니다. 화면 개발용 샘플 장소·더미 계정은 두지 않으며(장소 V15·커뮤니티 V40에서 삭제), 카카오 장소를 선택해 저장한 장소와 맛객별 추천 이유·메뉴·태그·방문 조건·사진은 장소 DB에 저장합니다. 한 장소에 여러 맛객의 기록을 연결하고 공개 기록은 지도와 상세에 함께 표시합니다.
- 비공개 기록은 작성자에게만 보입니다. 하트(가볼 곳), 다녀온 곳(빠른 저장·기록한 적 있는 곳), 별로였던 곳, 빠른 저장, 최근 본 장소(15일, 최대 30곳)도 계정별로 서버에 저장합니다. 화면 규칙은 [현재 UI 기준](docs/ui/current-design.md)에 있습니다.
- 빠른 저장과 새 기록은 기기 위치가 가게 1km 안일 때만 받습니다(다녀온 곳은 위치 없이 기록 가능). 자세한 기준은 [직접 다녀온 곳 확인](docs/api-boundaries.md#직접-다녀온-곳-확인)에 있습니다.
- 기록 작성자 이름·캐릭터는 요청 본문이 아니라 커뮤니티 프로필에서 가져옵니다. 여러 맛객이 함께 쓰는 가게 기본정보는 카카오 Local API로 확인된 값일 때만 갱신하고, 확인하지 못하면 새 가게일 때만 요청 값으로 저장합니다.
- 기록 사진과 메뉴 사진은 응답 JSON에 넣지 않고 `/media/...` 주소로 내려줍니다. 공개 기록 사진은 누구나 열 수 있고, 비공개 기록 사진은 작성자에게만 만료 시각과 서명이 붙은 주소로 제공합니다.
- 프로필·배경 이미지, 소개, 공개 태그·비공개 취향, 무료 구독은 커뮤니티 DB에 저장합니다. 배경 사진은 맛객마다 최대 10장까지 등록합니다. 유료 구독은 화면에서 "준비 중"으로 막아 두었습니다.
- 알림은 서버가 만듭니다. 화면은 맛집 등록 뒤 장소 ID만 보내고, 커뮤니티 모듈이 장소 모듈에서 본인 기록을 확인해 등록 완료 알림과(공개 기록이면) 구독자 알림을 저장합니다. 새 구독자 알림은 구독 신청 시 만들어지며, 알림은 90일 뒤 정리됩니다.
- 맛다공 첫 진입은 공통 인증 서버에 Authorization Code + PKCE 로그인을 요청합니다. 로그인하지 않았다면 공통 로그인 화면으로 이동하고, 인증·동의가 끝나면 `/auth/callback`에서 코드를 교환한 뒤 맛다공 홈으로 돌아옵니다. 새 카카오 계정은 첫 인증 때 공통 계정으로 생성됩니다.
- 포인트는 아직 없습니다. 적립·사용 처리 없이 조회만 있던 원장은 2026-11-25에 지웠고, 포인트 지갑 화면은 "준비 중"으로 남겨 두었습니다(잔액 0P, 서버 호출 없음). 포인트를 붙일 때는 여다공과 함께 쓰는 다공 공통 포인트 서버로 새로 만듭니다([포인트 원장 기준](docs/point-security.md)).

## 화면과 도메인 문서

- [개발 환경 설정 통합 안내 (다른 PC에서 똑같이 세팅)](docs/home-development-setup.md)
- [코딩 스타일 (두 저장소 공통, 서식 도구와 규칙)](docs/coding-style.md)
- [AI 작업 지침](AGENTS.md)
- [프런트엔드 구조](docs/frontend-structure.md)
- [현재 UI 기준](docs/ui/current-design.md), [테마 관리](docs/ui/theming.md)
- [백엔드](backend/README.md)
- [도메인 및 API 경계](docs/api-boundaries.md)
- [카카오 지도 설정](docs/kakao-map-setup.md)
- [포인트 원장 기준](docs/point-security.md)
