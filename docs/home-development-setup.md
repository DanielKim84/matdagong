# 다른 PC(집 PC)에서 개발 환경 똑같이 만들기

맛다공(`dagong-matdagong`)과 공통 인증(`dagong-auth`)을 다른 PC에서 회사 PC와 같은 상태로 실행하기 위한 **유일한 기준 문서**입니다. 이 문서와 다른 안내가 있으면 이 문서를 따릅니다.

- 기준 시점: 2026-11-02 (코드 패턴 정리·서식 도구 도입 이후 커밋 기준)
- 두 PC는 **같은 Neon 개발 DB**를 함께 씁니다. 로컬 PostgreSQL이나 Docker는 쓰지 않습니다.
- 비밀 값(비밀번호, 키)은 이 문서·Git·채팅에 적지 않고, 각 PC의 `.env` 파일에 직접 입력합니다.

---

## 1. 한눈에 보기

```text
C:\workspace\
├─ dagong-auth\        공통 로그인·계정 (Spring Boot 5840 + 로그인 화면 4840)
└─ dagong-matdagong\   맛다공 (Gateway 5843, 커뮤니티 5844, 장소 5845 + 앱 화면 4845)
```

| 순서 | 실행할 것 | 포트 | 실행 위치 | 명령 |
|---:|---|---:|---|---|
| 1 | 인증 API 서버 | 5840 | `C:\workspace\dagong-auth` | `.\gradlew.bat :backend:bootRun -x buildFrontend` |
| 2 | 로그인 화면 | 4840 | `C:\workspace\dagong-auth` | `npm.cmd run dev` |
| 3 | 커뮤니티 서비스 | 5844 | `C:\workspace\dagong-matdagong` | `.\gradlew.bat :matdagong-community-service:bootRun` |
| 4 | 장소 서비스 | 5845 | `C:\workspace\dagong-matdagong` | `.\gradlew.bat :matdagong-place-service:bootRun` |
| 5 | API Gateway | 5843 | `C:\workspace\dagong-matdagong` | `.\gradlew.bat :matdagong-api-gateway:bootRun` |
| 6 | 맛다공 앱 화면 | 4845 | `C:\workspace\dagong-matdagong` | `npm.cmd run dev` |

브라우저에서 **`http://localhost:4845`** 로 접속합니다. (`127.0.0.1`이나 PC IP로 접속하면 로그인이 실패합니다.)

| DB (Neon 프로젝트 `dagong`, 싱가포르) | 쓰는 서버 | DB 사용자 |
|---|---|---|
| `dagong_auth_dev` | 인증 API | `dagong_auth_app` |
| `matdagong_community_dev` | 커뮤니티 서비스 | `matdagong_community_app` |
| `matdagong_place_dev` | 장소 서비스 | `matdagong_community_app` (같은 사용자 재사용) |

호스트(세 DB 공통): `ep-crimson-mud-az60gpd9.c-3.ap-southeast-1.aws.neon.tech:5432`, SSL 필수.

---

## 2. 설치할 프로그램

| 프로그램 | 버전 | 비고 |
|---|---|---|
| Git | 최신 | |
| JDK | **21** | 회사 PC는 IntelliJ가 내려받은 Microsoft OpenJDK 21(`%USERPROFILE%\.jdks\ms-21.0.12.1`). Temurin 21도 됩니다. |
| Node.js | **24.22.1 이상, 25 미만** | 정확한 버전은 각 저장소 `frontend\.nvmrc`(24.22.1) |
| IntelliJ IDEA | 최신 | 선택. 터미널만으로도 실행 가능 |

Gradle은 설치하지 않습니다. 저장소의 `gradlew.bat`(Gradle 8.14.6)이 자동으로 받습니다.

**터미널에서 `java`를 못 찾는 경우** (IntelliJ로만 JDK를 받은 PC에서 흔함): PowerShell을 열 때마다 아래를 먼저 실행하거나, Windows 환경 변수에 `JAVA_HOME`을 등록합니다.

```powershell
$env:JAVA_HOME = "$env:USERPROFILE\.jdks\ms-21.0.12.1"   # 실제 설치 폴더 이름으로
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version   # 21.x 가 나와야 함
```

**PowerShell에서 `npm`이 "스크립트를 실행할 수 없습니다"로 막히는 경우**: `npm` 대신 `npm.cmd`를 씁니다(이 문서는 처음부터 `npm.cmd`로 적었습니다).

---

## 3. 코드 받기

처음이면 clone, 이미 있으면 **두 저장소 모두** 최신으로 받습니다. 두 PC가 같은 DB를 쓰므로, 오래된 코드로 서버를 띄우면 DB 구조와 맞지 않아 오류가 납니다.

```powershell
cd C:\workspace
git clone https://github.com/DanielKim84/dagong-auth.git dagong-auth      # 처음 한 번
git clone https://github.com/DanielKim84/matdagong.git dagong-matdagong   # 처음 한 번 (폴더 이름 주의)

git -C C:\workspace\dagong-auth pull
git -C C:\workspace\dagong-matdagong pull
```

---

## 4. 비밀 값 준비 (어디서 가져오나)

| 값 | 넣을 파일 | 가져오는 곳 |
|---|---|---|
| `dagong_auth_app` 비밀번호 | `dagong-auth\.env` | Neon 콘솔 → 프로젝트 `dagong` → **Connect** → DB `dagong_auth_dev`, Role `dagong_auth_app` 선택 → 연결 문자열의 비밀번호(눈 아이콘으로 표시) |
| `matdagong_community_app` 비밀번호 | `dagong-matdagong\.env` (2곳) | 위와 같이 Role `matdagong_community_app` 선택 |
| 카카오 REST API 키 | 두 `.env` 모두 | Kakao Developers → 맛다공 앱 → **앱 키 → REST API 키** |
| 카카오 Client Secret | `dagong-auth\.env` | Kakao Developers → 맛다공 앱 → **카카오 로그인 → 보안 → Client Secret** |
| 카카오 JavaScript 키 | `dagong-matdagong\frontend\.env.local` | Kakao Developers → 맛다공 앱 → **앱 키 → JavaScript 키** |
| 네이버 Client ID·Client Secret | `dagong-auth\.env` | 네이버 Developers → 내 애플리케이션 → 맛다공 앱 → **개요 → 애플리케이션 정보** |
| 서명 키 비밀번호 | `dagong-auth\.env` | 이 PC에서 새로 정하는 임의의 긴 문자열 |
| 사진 주소 서명 키 | `dagong-matdagong\.env` | 이 PC에서 새로 정하는 임의의 32자 이상 문자열 |

- **DB 사용자는 새로 만들지 않고 위 표의 사용자를 그대로 씁니다.** PC마다 다른 사용자를 쓰면 한쪽이 만든 테이블을 다른 쪽이 고치지 못해(Postgres는 테이블 주인만 구조 변경 가능) Flyway 마이그레이션이 실패합니다.
- Neon 콘솔에서 비밀번호가 보이지 않으면 회사 PC의 `.env`를 보고 직접 옮겨 적습니다(채팅·메신저·Git으로 보내지 않기). Neon에서 비밀번호를 **재설정하면 회사 PC `.env`도 같이 바꿔야** 합니다.
- 카카오 앱에는 이미 아래가 등록되어 있어 PC가 바뀌어도 그대로 동작합니다(둘 다 `localhost`라서). 새로 등록할 필요 없습니다.
  - 카카오 로그인 Redirect URI: `http://localhost:4840/login/oauth2/code/kakao`
  - 플랫폼 Web 도메인: `http://localhost:4845`
- 네이버 앱에는 **API 설정 → 네이버 로그인 → PC 웹**에 서비스 URL `http://localhost:4840`, Callback URL `http://localhost:4840/login/oauth2/code/naver`를 등록하고, 제공 정보로 **별명**을 고릅니다. 검수 전에는 **멤버관리**에 등록한 네이버 아이디만 로그인할 수 있습니다.

---

## 5. 설정 파일 만들기 (3개)

`.env`, `.env.local`은 Git에 올라가지 않습니다. 각 PC에서 직접 만듭니다.

### 5-1. `C:\workspace\dagong-auth\.env`

```dotenv
DB_URL=jdbc:postgresql://ep-crimson-mud-az60gpd9.c-3.ap-southeast-1.aws.neon.tech:5432/dagong_auth_dev?sslmode=require
DB_USERNAME=dagong_auth_app
DB_PASSWORD=<dagong_auth_app 비밀번호>

AUTH_ISSUER=http://localhost:5840
AUTH_LOGIN_PAGE_URL=http://localhost:4840/login
AUTH_LOGIN_SUCCESS_URL=http://localhost:4840/login?login=success
AUTH_LOGIN_FAILURE_URL=http://localhost:4840/login?error

AUTH_KEYSTORE_PASSWORD=<이 PC에서 정한 서명 키 비밀번호>
AUTH_KEYSTORE_ALIAS=dagong-auth-signing
# 개발 PC에서만 로그인 유지 시간을 8시간으로 늘립니다(기본 30분).
AUTH_ACCESS_TOKEN_TTL=PT8H

KAKAO_CLIENT_ID=<카카오 REST API 키>
KAKAO_CLIENT_SECRET=<카카오 Client Secret>

NAVER_CLIENT_ID=<네이버 Client ID>
NAVER_CLIENT_SECRET=<네이버 Client Secret>
```

`AUTH_KEYSTORE_PATH`, `KAKAO_REDIRECT_URI`, `NAVER_REDIRECT_URI`는 적지 않습니다(기본값 사용: `%USERPROFILE%\.dagong-auth\auth-signing.p12`, `http://localhost:4840/login/oauth2/code/kakao`, `.../naver`). 네이버 값을 아직 받지 않았으면 두 줄을 빼 두면 되고, 그동안 네이버 버튼은 네이버 오류 화면으로 넘어갑니다.

### 5-2. 서명 키 만들기 (PC마다 한 번)

회사 PC의 키 파일을 복사하지 않고 새로 만듭니다. 비밀번호는 위 `AUTH_KEYSTORE_PASSWORD`와 같은 값을 입력합니다.

```powershell
New-Item -ItemType Directory "$env:USERPROFILE\.dagong-auth" -Force
$keyPassword = Read-Host "AUTH_KEYSTORE_PASSWORD"
keytool -genkeypair -alias dagong-auth-signing -keyalg RSA -keysize 2048 -storetype PKCS12 `
  -keystore "$env:USERPROFILE\.dagong-auth\auth-signing.p12" `
  -storepass $keyPassword -keypass $keyPassword `
  -dname "CN=Dagong Auth Development" -validity 3650
```

`keytool`을 못 찾으면 2장의 `JAVA_HOME` 설정을 먼저 합니다(`keytool`은 JDK의 `bin` 폴더에 있습니다).

### 5-3. `C:\workspace\dagong-matdagong\.env`

```dotenv
COMMUNITY_DB_URL=jdbc:postgresql://ep-crimson-mud-az60gpd9.c-3.ap-southeast-1.aws.neon.tech:5432/matdagong_community_dev?sslmode=require
COMMUNITY_DB_USERNAME=matdagong_community_app
COMMUNITY_DB_PASSWORD=<matdagong_community_app 비밀번호>

PLACE_DB_URL=jdbc:postgresql://ep-crimson-mud-az60gpd9.c-3.ap-southeast-1.aws.neon.tech:5432/matdagong_place_dev?sslmode=require
PLACE_DB_USERNAME=matdagong_community_app
PLACE_DB_PASSWORD=<matdagong_community_app 비밀번호>

KAKAO_REST_API_KEY=<카카오 REST API 키>
PLACE_MEDIA_SIGNING_KEY=<이 PC에서 정한 32자 이상 임의 문자열>
```

서비스 주소(`COMMUNITY_SERVICE_URL`, `PLACE_SERVICE_URL`)는 기본값(5844, 5845)과 같으므로 적지 않습니다.

### 5-4. `C:\workspace\dagong-matdagong\frontend\.env.local`

```dotenv
VITE_KAKAO_MAP_APP_KEY=<카카오 JavaScript 키>
VITE_AUTH_SERVER_URL=http://localhost:5840
VITE_AUTH_CLIENT_ID=matdagong-web-dev
VITE_AUTH_REDIRECT_URI=http://localhost:4845/auth/callback
```

선택 값: `VITE_APP_THEME`(시즌 테마 강제, 예 `halloween`), `VITE_FEATURE_AI_PICK=true`(발견 지도에 AI 추천 칩 표시). 평소에는 적지 않습니다.

`dagong-auth\frontend`에는 설정 파일이 필요 없습니다.

---

## 6. 화면 패키지 설치 (처음 한 번, 그리고 `package-lock.json`이 바뀌었을 때)

```powershell
cd C:\workspace\dagong-auth\frontend;      npm.cmd ci
cd C:\workspace\dagong-matdagong\frontend; npm.cmd ci
```

---

## 7. 실행

PowerShell 창 6개를 열고 1장 표의 순서대로 실행합니다. Java 서버 창에서는 먼저 2장의 `JAVA_HOME` 설정을 합니다.

```powershell
# 창 1 — 인증 API (5840)
cd C:\workspace\dagong-auth
.\gradlew.bat :backend:bootRun -x buildFrontend

# 창 2 — 로그인 화면 (4840)
cd C:\workspace\dagong-auth
npm.cmd run dev

# 창 3 — 커뮤니티 서비스 (5844)
cd C:\workspace\dagong-matdagong
.\gradlew.bat :matdagong-community-service:bootRun

# 창 4 — 장소 서비스 (5845)
cd C:\workspace\dagong-matdagong
.\gradlew.bat :matdagong-place-service:bootRun

# 창 5 — API Gateway (5843)
cd C:\workspace\dagong-matdagong
.\gradlew.bat :matdagong-api-gateway:bootRun

# 창 6 — 맛다공 앱 화면 (4845)
cd C:\workspace\dagong-matdagong
npm.cmd run dev
```

- 창 1의 `-x buildFrontend`는 로그인 화면을 JAR에 넣는 빌드를 건너뛰는 옵션입니다. 개발 중에는 창 2의 개발 서버가 로그인 화면을 보여 주므로 필요 없습니다.
- Gradle 서버는 로그가 `Started ...Application` 이후 `EXECUTING`에서 멈춰 있는 것이 정상입니다(실행 중이라는 뜻).
- **IntelliJ로 실행할 때**: 각 저장소 루트를 Gradle 프로젝트로 열면 공유 실행 구성(`.run` 폴더)이 보입니다. `Dagong Auth`, `Matdagong Community Service`, `Matdagong Place Service`, `Matdagong API Gateway`를 실행하고, 화면 두 개는 터미널에서 `npm.cmd run dev`로 띄웁니다. Project SDK는 21로 맞춥니다.

---

## 8. 정상 확인

1. `http://localhost:4845` 접속 → 로그인 화면(4840)으로 이동 → **카카오로 시작하기** → 카카오 로그인 → 맛다공 발견(지도) 화면으로 돌아오면 성공.
2. 지도가 보이고 하단 탭(발견·피드·가운데 내 지도·맛객·나)이 있으면 화면과 API 연결 정상.
3. 회사 PC에서 만든 기록·구독이 그대로 보이면 공유 DB 연결 정상.

---

## 9. 자주 막히는 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| `'java'은(는) ... 아닙니다`, `JAVA_HOME is not set` | 터미널에 JDK 경로 없음 | 2장의 `JAVA_HOME` 설정 |
| `npm : ... 스크립트를 실행할 수 없습니다` | PowerShell 실행 정책 | `npm` 대신 `npm.cmd` |
| `password authentication failed for user ...` | `.env` DB 비밀번호 틀림(또는 Neon에서 재설정됨) | 4장 방법으로 비밀번호 다시 확인 |
| `permission denied for table/schema ...` | 표와 다른 DB 사용자를 씀 | 1장 표의 사용자로 맞추기. 새 사용자 만들지 않기 |
| `Validate failed: Migration checksum mismatch` | 이미 적용된 마이그레이션 SQL이 바뀐 코드 | 두 저장소 `git pull`. 마이그레이션 파일을 직접 고치지 않기 |
| 인증 서버 시작 시 keystore 오류 | 서명 키 파일 없음 또는 비밀번호 불일치 | 5-2를 `.env`의 `AUTH_KEYSTORE_PASSWORD`로 다시 실행(기존 파일 삭제 후) |
| 로그인 후 다시 로그인 화면으로 돌아감, `state` 오류 | `localhost`가 아닌 주소로 접속 | 반드시 `http://localhost:4845` |
| 카카오 로그인에서 `KOE006` 등 Redirect URI 오류 | 카카오 앱 설정 누락 | 4장 마지막의 Redirect URI가 등록돼 있는지 확인 |
| 지도 자리에 "지도 키" 안내만 보임 | `.env.local` 없음 또는 수정 후 재시작 안 함 | 5-4 작성 후 창 6 재시작 |
| 화면은 뜨는데 목록이 비고 401 오류 | 인증 서버가 꺼졌거나 다른 PC에서 받은 로그인 | 창 1 확인 → 앱에서 로그아웃 후 다시 로그인 |
| `Port 5840 was already in use` 등 | 같은 서버가 이미 실행 중 | 이미 떠 있는 창을 쓰거나 그 프로세스를 끄고 다시 실행 |
| 기록 날짜·취향 % 같은 최신 기능이 안 보임 | 서버를 최신 코드로 다시 띄우지 않음 | `git pull` 후 해당 서버 재시작 |

---

## 10. AI(Claude·Codex)에게 설정을 맡길 때

두 저장소 루트의 `AGENTS.md`(Claude Code는 `CLAUDE.md`를 통해 같은 파일)를 AI 도구가 자동으로 읽어 한국어 응답, 코딩 스타일([coding-style.md](coding-style.md)), 비밀 값 규칙을 따릅니다. 환경 설정을 맡길 때는 아래 문장을 추가로 붙여 넣습니다.

> `C:\workspace\dagong-matdagong\docs\home-development-setup.md` 를 읽고 그대로 이 PC의 개발 환경을 맞춰 줘. 아래는 정해진 사항이니 바꾸지 마.
> - DB는 Neon 공유 개발 DB만 쓴다. 로컬 PostgreSQL·Docker를 띄우거나 DB 사용자를 새로 만들지 않는다.
> - 포트(4840·4845·5840·5843·5844·5845)와 접속 주소(`localhost`)를 바꾸지 않는다.
> - 이미 적용된 Flyway 마이그레이션 파일을 고치거나, 설정을 위해 새 마이그레이션을 만들지 않는다.
> - `.env.example`에 실제 값을 넣지 않는다. 비밀 값은 채팅에 묻거나 출력하지 말고, 내가 `.env`·`.env.local`에 직접 입력하게 안내한다.
> - 코드나 설정 파일 구조를 고치지 말고, 오류가 나면 문서 9장의 표부터 확인한다. 표에 없는 오류면 원인을 설명하고 고치기 전에 나에게 묻는다.

---

## 11. 보안 주의

- 회사 PC의 `.env`, `.env.local`, `auth-signing.p12` 파일을 복사해 옮기지 않습니다. 각 PC에서 새로 만듭니다.
- 비밀 값은 Git·채팅·메신저에 붙여 넣지 않습니다.
- Neon 개발 DB에는 테스트 데이터만 넣습니다. 두 PC가 같은 데이터를 보므로, 한쪽에서 지운 데이터는 다른 쪽에서도 사라집니다.

---

## 이 문서를 고칠 때

포트, 환경 변수, DB, 실행 명령, 필요한 프로그램 버전이 바뀌면 같은 커밋에서 이 문서를 함께 고치고, 맨 위 "기준 시점"을 갱신합니다.
