# 코딩 스타일

맛다공(`dagong-matdagong`)과 공통 인증(`dagong-auth`)이 함께 따르는 **유일한 코딩 스타일 기준**입니다. 어느 PC, 어느 편집기, 어느 AI 도구로 작업하든 결과가 같도록 **서식은 도구가 정하고**, 도구가 정하지 못하는 부분만 아래 규칙으로 맞춥니다.

## 1. 서식은 도구로 맞춥니다

| 대상 | 도구 | 설정 파일 | 정리 명령 | 검사 명령 |
|---|---|---|---|---|
| 화면 TS·TSX·CSS·JSON·HTML | Prettier 3.6.2 | 저장소 루트 `.prettierrc.json`, `frontend/.prettierignore` | 저장소 루트에서 `npm.cmd run format` | `npm.cmd run format:check` |
| 서버 Java | Spotless + Palantir Java Format 2.50.0 | `build.gradle`의 `spotless` 블록 | `.\gradlew.bat spotlessApply` (인증: `:backend:spotlessApply`) | `spotlessCheck` (`gradlew build`에 포함) |
| 모든 파일 기본값 | EditorConfig | `.editorconfig` | 편집기가 자동 적용 | — |
| 줄바꿈 | Git | `.gitattributes` | 자동(LF, `.bat`·`.cmd`만 CRLF) | — |

정해진 값: 들여쓰기 2칸(Java 4칸), 한 줄 최대 120자, 큰따옴표, 문장 끝 세미콜론, 여러 줄 목록의 마지막 쉼표, UTF-8, LF, 파일 끝 빈 줄 하나.

**작업을 마치기 전 순서**

```powershell
npm.cmd run format                 # 저장소 루트(화면 서식)
.\gradlew.bat spotlessApply        # 저장소 루트(Java 서식, 인증 저장소는 :backend:spotlessApply)
npx tsc --noEmit -p .              # frontend 폴더(타입 검사)
.\gradlew.bat test                 # 저장소 루트(서버 테스트, 인증 저장소는 :backend:test -x buildFrontend)
```

**편집기 설정 (선택, 저장할 때 자동 정리)**

- IntelliJ: EditorConfig는 기본 지원. Settings → Languages & Frameworks → JavaScript → Prettier → *Automatic Prettier configuration*, *Run on save* 켜기. Java는 *palantir-java-format* 플러그인을 쓰거나 커밋 전 `spotlessApply`.
- VS Code: *Prettier*, *EditorConfig* 확장을 설치하고 `editor.formatOnSave`를 켭니다.

서식만 바꾼 변경은 기능 변경과 **다른 커밋**으로 나눕니다.

## 2. 공통 규칙

- **언어**: 사용자에게 보이는 문구, 주석, 문서는 한국어. 코드의 이름(변수·함수·클래스·파일)은 영어.
- **주석**: 코드만 봐서는 알 수 없는 *이유·제약·주의점*만 짧게 씁니다. 코드를 그대로 풀어 쓰는 주석, 주석 처리한 옛 코드는 남기지 않습니다(이력은 Git에 있음). 사라진 화면·파일을 가리키는 주석은 바로 고칩니다.
- **이름**: 줄임말 대신 뜻이 드러나는 이름(`placeCount`, `refreshNotifications`). 불리언 변수·props·필드는 `is·has·can·should`로 시작(`isLiked`, `hasOwnRecord`). 단, 서버와 주고받는 JSON 필드 이름은 API 그대로 둡니다(`verified` 등).
- **한 곳에만 만들기**: 같은 일을 하는 함수·부품·상수를 두 번 만들지 않습니다. 이미 공용으로 있는지(아래 3·5장 목록) 먼저 찾고, 없으면 공용 위치에 새로 만듭니다.
- **크기**: 함수는 한 가지 일만 합니다. 파일이 300줄을 넘으면 같은 폴더의 하위 부품·훅·계산 모듈로 나눕니다(약관 본문 같은 데이터 파일은 예외).
- **죽은 코드 금지**: 쓰지 않는 파일·함수·export·CSS 규칙·이미지는 바로 지웁니다. 나중에 쓸 계획인 DB 칼럼·API는 그 이유를 주석이나 문서에 적어 둡니다.
- **비밀 값**: 키·비밀번호는 `.env`·`.env.local`에만 두고 코드·문서·`.env.example`에 실제 값을 쓰지 않습니다.

## 3. TypeScript · React (`frontend/src`)

**파일과 폴더**

| 종류 | 이름 | 예 |
|---|---|---|
| 화면·컴포넌트 | PascalCase `.tsx`, 파일 하나에 컴포넌트 default export 하나 | `PlaceDetailScreen.tsx` |
| 훅 | `useXxx.ts` (여러 화면이 쓰면 `hooks/`, 한 영역만 쓰면 그 영역 폴더) | `useModalLock.ts`, `useRecordPhotos.ts` |
| 계산·데이터 모듈 | camelCase `.ts`, React 없음 | `discoverModel.ts`, `recordValidation.ts` |
| 화면 묶음 | `screens/<영역>/` (discover, mymap, place, feed, record, tasters, me, onboarding, profile-edit) | |

구조와 각 폴더의 책임은 [프런트엔드 구조](frontend-structure.md)를 따릅니다.

**이름**

- 컴포넌트 안 내부 함수는 동사형(`save`, `locate`, `toggleLike`), 부모에게 받는 콜백 props는 `onX`(`onClose`, `onSelect`). `handleX`는 쓰지 않습니다.
- 모듈 최상위 상수(배열·객체·숫자·문자열)는 `UPPER_SNAKE_CASE`(`PAGE_SIZE`, `TABS`), 타입은 PascalCase, 나머지는 camelCase.
- 정렬 비교 함수 인자는 `(left, right)`.

**코드**

- `strict` TypeScript. `any` 대신 `unknown`을 받고 좁혀서 씁니다. `as` 단언과 `!`는 피하고 좁히는 함수를 씁니다.
- 타입은 `type`. `interface`는 전역 선언(`kakao.d.ts`, `vite-env.d.ts`)에서만. props 타입은 매개변수 자리에 바로 적습니다(`function X({ title }: { title: string })`). props가 6개 이상이면 `type Props`로 따로 둡니다.
- 컴포넌트는 `function` 선언. 보조 함수·타입은 named export.
- 화면이 쓰는 앱 데이터와 동작은 props로 내려보내지 않고 `useAppData()`로 꺼냅니다(하위 부품도 직접). 목록 아이템처럼 순수 표시 부품만 값을 props로 받습니다.
- 서버 호출은 `services/`의 함수(`apiRequest` 경유)로만 합니다. services 함수의 첫 인자는 `accessToken`. 화면에서 `fetch`를 직접 쓰지 않습니다.
- 오류 문구는 `errorMessage(cause, "기본 문구")`(`utils/errorMessage.ts`). `catch((cause: Error) => …)`처럼 타입을 단정하지 않고, 상황 구분은 서버 문구가 아니라 `ApiError.status`로 합니다.
- 비동기 effect는 `let active = true; … return () => { active = false; };`로 늦게 온 응답을 버립니다.
- import 순서: 외부 패키지 → `app/` → `components/` → `hooks/` → `services/` → `models/` → `utils/` → 같은 폴더(`./`) → CSS. 같은 모듈을 두 번 import하지 않습니다.
- 접근성: 누르는 것은 `<button type="button">`·`<a>`, 아이콘만 있는 버튼에는 `aria-label`, 누르는 영역은 44px 이상. 오류 안내는 `role="alert"`, 불러오는 중은 `role="status"`.

**먼저 찾아 쓸 공용 부품·함수** (같은 것을 영역 안에 다시 만들지 않음)

| 필요한 것 | 쓸 것 |
|---|---|
| 상단 바 / 떠 있는 상단 바 | `TopBar`, `TopBar variant="float"` |
| 섹션 제목(+오른쪽 링크·개수) / 날짜 묶음 머리("오늘 3개") | `SectionHead` (`action`, `meta`, `children`) / `SectionHead className="r-section-head--date"` |
| 빈 화면·오류·불러오는 중 | `EmptyState`(`tone`, `action.variant`), `Skeleton` — 다시 시도 문구는 "다시 불러오기" |
| 시트·확인창·안내 | `Sheet`, `useNotificationDialog().confirm/alert`, `actions.notify` (위험한 동작은 `tone: "danger"` 확인) |
| 사진 칸 / 대표 사진 | `PlaceThumb`, `placePhoto()` |
| 맛집 목록 한 줄(카드) | `PlaceCard` (`r-place-cards` 목록 안에) |
| 모음·별로였던 곳의 사진 카드(하트·이름표·고르기) | `PlaceTile` |
| 가게 1km 안인지(직접 다녀온 곳 확인) | `utils/visitCheck.ts` (`checkVisitNow`, `visitCheckMessage`) |
| 주변 가게 검색에 쓸 지금 위치·안내 문구, 반경 안 가게 찾기 / 검색 결과의 검색어 강조 | `useCurrentLocation`, `searchNearbyKakaoPlaces`(`services/kakao.ts`), `SearchHighlight` |
| 맛객 사진 | `TasterAvatar`, `avatarSource()` |
| 진행 막대, 캐릭터, 페이지 점 | `StepProgress`, `MascotArt`, `PaginationDots` |
| 모달 잠금, 스와이프 | `useModalLock`, `useSwipe` |
| 시각·날짜·숫자·원·거리·분류 표시 | `utils/format.ts` (`formatRelativeTime`, `formatMonthDay`, `formatNumber`, `formatWon`, `formatDistance`, `categoryLabel`·`shortCategory`(가게 분류는 제공처 글자 그대로 저장되어 있어 화면에서만 "카페 · 커피전문점"처럼 줄임), `DAY_MS`, `startOfDay` …). `toLocaleString`을 화면에서 직접 쓰지 않음 |
| 길찾기·공유(안내 포함)·카카오맵 주소 | `utils/placeLinks.ts` (`openDirections`, `sharePlaceWithNotice`, `kakaoPlaceUrl`) |
| 내 기록 판별, 고른 카카오 가게와 같은 장소인지 | `isMyTaster()`, `MY_TASTER_ID`, `isSameKakaoPlace()`, `KAKAO_PROVIDER_CODE` (`models/place.ts`) |
| 취향 분류 이름·한도·분야별 분류, 분류별로 묶기 | `models/tasteTags.ts` (`TASTE_TAG_GROUPS`, `groupsForFocus`, `groupTagsByDictionary`) |
| 취향 태그 고르기(분류 줄 + 분류별 시트) / 분류 아이콘·색 | `TasteTagPicker`, `GroupIcon`(`tagGroupLook`) |
| 닉네임 입력(겹치는지 미리 확인) | `useNicknameCheck` + `NicknameCheckNote` |
| 브라우저 저장소 | `utils/storage.ts` (`STORAGE_KEYS`, `readStorage`/`writeStorage`/`readStorageJson` …). `localStorage`·`sessionStorage`를 직접 쓰지 않음. 새 키 이름은 `matdagong.<영역>.<이름>` |

## 4. CSS (`frontend/src/styles`, `frontend/src/theme`)

- 새 화면 스타일은 `styles/renewal/<영역>.css`에 둡니다. 공통 부품은 `styles/renewal/ui.css`.
- 클래스 이름: `r-<영역>-<블록>__<요소>--<변형>` (예: `r-discover-sheet__title`), 상태는 `is-on`, `is-selected`처럼 `is-`로 시작. 화면 최상위는 `<main className="r-screen r-<영역>">`(하위 화면은 `r-<영역>-<화면>`, `-screen` 접미사 없음).
- 색·글꼴·반경·그림자는 **테마 토큰만** 씁니다(`var(--color-primary)`, `var(--neutral-100)`, `var(--font-display)`). 반경 토큰: `--radius-xs`(4) · `--radius-sm`(12) · `--radius-md`(14) · `--radius-control`(16) · `--radius-card`(22) · `--radius-sheet`(28) · `--radius-pill`. 맞는 토큰이 없을 때만 숫자를 쓰고 이유를 주석으로 남깁니다. 자세한 내용은 [테마 관리](ui/theming.md).
- 애니메이션·스켈레톤·글자 버튼·오류 안내는 공용(`r-pulse`, `.r-skeleton`, `.r-text-button`, `.visually-hidden`, 상자형 `.r-error-box`·글자형 `.r-error-text`)을 씁니다.
- 칩(`.r-chip`)과 작은 둥근 버튼(`.r-button--pill`, 정렬·지역 고르기 같은 둥근 버튼)의 높이는 `--pill-height`(40px) 하나입니다. 영역 CSS에서 높이를 따로 줄이지 않습니다(칩은 누르는 영역을 44px로 넓혀 둠).
- 글자색 대비: 읽어야 하는 글자·placeholder·뜻 있는 아이콘은 `--color-muted` 이상, `--color-subtle`은 비활성·장식에만 씁니다. 초록 글자는 `--color-success-text`, 진한 색 바탕 흰 글자는 600 단계 이상(앰버 바탕에는 `--amber-900` 글자)입니다.
- 강조색은 뜻에 따라 정해진 것만 씁니다([현재 UI 기준 · 색 역할](ui/current-design.md#색-역할)). 정보 태그는 `.r-tag`, 나와의 관계(내 기록·구독 중·나와 같아요)는 `.r-tag--mine`, 지금 고른 상태는 먹색(`.r-chip.is-on`, `.r-segmented`)입니다. 영역 CSS에서 태그·선택 색을 새로 만들지 않습니다.
- 공용 부품(`.r-empty`, `.r-button` 등)의 모양을 바꿀 때는 영역 클래스 아래로 한정합니다(`.r-me-empty .r-button`). 전역으로 덮어쓰지 않습니다.
- 밝은 분위기를 유지합니다(다크 테마는 별도 요청이 있을 때만).
- 선택자는 짧게: 클래스 하나 또는 두 단계까지. id 선택자는 앱 루트(`#root`) 외에는 쓰지 않습니다.
- `!important`는 움직임 줄이기(`prefers-reduced-motion`), 스크롤 잠금처럼 반드시 이겨야 하는 경우에만 씁니다.

## 5. Java (`backend`)

- 4칸 들여쓰기, 120자 — Palantir 포매터가 맞춥니다.
- **패키지는 기능별**(`profile`, `subscription`, `notification`, `record`, `like` …). 한 기능 안에서:
  - **Controller**: HTTP 입출력만. `JdbcTemplate`·`@Transactional`을 쓰지 않습니다.
  - **Service**: 규칙, DB 작업, 트랜잭션. 조회만 하는 메서드는 `@Transactional(readOnly = true)`, 데이터를 바꾸는 메서드만 `@Transactional`.
  - **`XxxModels`**: 그 기능의 요청·응답 `record`를 한 파일에 모읍니다. `import static …XxxModels.*`는 이 묶음에만 씁니다.
- **서비스 공통 코드는 `backend/matdagong-common`**(인증 계정 꺼내기, JWT 검증, 서비스 간 RestClient, 이미지 형식 검사, 오류 처리 기반, 같은 상황의 공통 오류(`web/ApiErrors`), 시각 변환, LIKE 검색어 이스케이프(`LikePatterns`), 배열 칼럼(`ARRAY(...)`·`array_agg`)을 목록으로 읽기와 `= ANY(?::uuid[])` 값 만들기(`jdbc/JdbcArrays`), 빈 선택 입력을 NULL로 바꾸기(`text/Texts.blankToNull`), 테스트용 embedded PostgreSQL과 동시 요청 재현 도우미). 서비스마다 같은 코드를 복사하지 않습니다.
- **서비스 안 공용 조회**: 커뮤니티의 프로필 SQL 조각·조회(배경 사진·프로필 태그 배열, 프로필 사진 주소, 존재 확인·잠금·닉네임, 신고로 가림 조건)는 `profile/ProfileQueries`, 장소의 장소 응답 조립은 `catalog/PlaceViewLoader`, 가게 행 저장은 `catalog/PlaceUpserts`(분류는 제공처 글자 그대로 저장), 방문 거리 확인과 거리 문구(`MAX_VISIT_DISTANCE_LABEL`)는 `location/NearbyPlaceGuard`를 씁니다.
- **오류 응답**: `ResponseStatusException`(한국어 문구)을 던지고, 서비스마다 하나 있는 `@RestControllerAdvice`가 `ProblemDetail`의 `detail`로 내보냅니다. 화면(`services/http.ts`)은 `detail`을 그대로 보여 줍니다. 같은 상황은 같은 상태 코드·문구(상수)로 답합니다(예: 프로필이 먼저 필요 → 409 "맛객 프로필을 먼저 만들어 주세요.").
- **검증**: 형식(길이·패턴·범위)은 record 애너테이션과 `@Valid`, 정해진 값 목록은 enum으로 받습니다. 공백 제거 같은 값 정리는 record의 compact constructor에서 검증 전에 합니다. Service는 업무 규칙만 확인합니다.
- **상태 값**은 enum으로 다룹니다(DB·JSON 값은 그대로).
- 의존성은 생성자 주입, 필드는 `private final`. 필드 주입(`@Autowired` 필드)은 쓰지 않습니다. 운영용 생성자 + 테스트용 package-private 생성자(RestClient·Clock 주입)가 있을 때만 운영 생성자에 `@Autowired`를 붙입니다.
- **JDBC**: 필드 이름 `jdbc`(`JdbcTemplate`), RowMapper 인자 `(rs, row)`, UUID는 `rs.getObject(col, UUID.class)`, 시각은 `OffsetDateTime`, 존재 확인은 `EXISTS`, 여러 값은 `= ANY(?::uuid[])`. SQL은 텍스트 블록(`"""`)에 쓰고 **값은 항상 `?` 바인딩**. 고정된 SQL 조각을 조합하는 것은 괜찮지만 사용자 값을 이어 붙이지 않습니다. 검색어를 `LIKE`·`ILIKE`에 넣을 때는 `LikePatterns.contains()`로 바인딩하고 `ESCAPE '\'`를 붙입니다(Java 텍스트 블록에서는 `'\\'`).
- 사용자에게 돌아가는 오류 메시지는 한국어. 로그에 토큰·비밀번호·개인정보를 남기지 않습니다. 예상하지 못한 오류(500)는 내부 메시지를 응답에 담지 않습니다.
- **Flyway**: 이미 적용된 마이그레이션 파일은 절대 고치지 않고 새 버전(`V<n>__설명.sql`)을 추가합니다. 테이블·칼럼 설명은 `COMMENT ON`으로 남깁니다.
- **테스트**: DB를 쓰는 테스트는 `*IntegrationTest`로 이름 짓고, 공통 지원 클래스로 embedded PostgreSQL을 클래스당 한 번 띄운 뒤 테스트마다 TRUNCATE 합니다(`getPostgresDatabase()`는 부를 때마다 새 DataSource를 만들므로 하나를 받아 공유). DB 없는 테스트는 `*Test`. 의존성에 `null`을 넣지 말고 실제 객체나 테스트 대역을 씁니다. 메서드 이름은 한국어로 동작을 설명해도 됩니다(`일치율은_내_좋아요_태그_중_겹친_비율이다`).
- 인증 저장소(`dagong-auth`)도 같은 규칙을 따릅니다(저장소가 달라 common 모듈은 함께 쓰지 않음).

## 6. Git

- 커밋 메시지는 영어 명령형 한 줄 요약(50자 안팎) + 필요하면 빈 줄 뒤 `-` 목록 본문. 예: `Add taste match percentage to taster list`.
- 한 커밋에는 한 가지 목적. 서식 정리, 파일 이동, 기능 변경을 섞지 않습니다.
- `.env`, 키 파일, 빌드 결과물(`build/`, `dist/`, `node_modules/`)은 커밋하지 않습니다.

## 이 문서를 고칠 때

규칙을 바꾸면 도구 설정(`.prettierrc.json`, `build.gradle`의 `spotless`, `.editorconfig`)도 같은 커밋에서 함께 바꾸고, 전체 코드를 한 번 다시 정리합니다.
