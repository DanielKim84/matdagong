# 프런트엔드 구조

React 화면, 서버 API 호출, 탭·브라우저에 잠시 남기는 값을 분리합니다. 사용자 기록은 서버(API Gateway 뒤의 각 서비스)에 저장합니다.

```text
index.html → src/main.tsx → app/signIn.ts (로그인·가입 확인) → app/startupView.tsx (소개·가입 또는 앱)
                                                           → app/App.tsx (AppData 제공) → screens/<영역>/*
화면 → services/*.ts → services/http.ts(apiRequest) → API Gateway → 장소·커뮤니티 서비스
화면 → services/auth.ts → 공통 인증 서버(/auth-api)
화면 → components/*, hooks/*, models/*, utils/*
```

## 폴더와 주요 파일

| 경로 | 책임 |
| --- | --- |
| `src/main.tsx` | 진입점. 테마 적용, 로그인 확인 후 시작 화면 그리기 |
| `src/app/signIn.ts` | 공통 인증(Authorization Code + PKCE) 로그인 시작·완료, 로그아웃, 로그인 전 주소 기억·복원 |
| `src/app/startupView.tsx` | 로그인 중·오류·소개·가입·앱 중 무엇을 그릴지 정하고 렌더링 |
| `src/app/App.tsx` | 서버 데이터를 불러와 `AppData`로 묶고, 해시 주소에 맞는 화면(경로→화면 표)과 하단 탭을 그림 |
| `src/app/AppData.tsx` | 화면들이 함께 쓰는 데이터와 동작(좋아요, 구독, 기록 저장, 프로필 저장, 알림 등). 화면은 props 대신 `useAppData()`로 꺼내 씀 |
| `src/app/useNotifications.ts`, `useLegacyMigration.ts`, `enrichPlaces.ts`, `accountRole.ts` | App에서 나눈 알림 상태, 예전 브라우저 기록 서버 이전, 장소에 작성자 정보 합치기, 계정 역할 계산 |
| `src/app/navigation.ts` | 해시 주소(`#화면/ID`)와 앱 내부 뒤로 가기 기록. 화면 목록은 `SCREENS` |
| `src/screens/<영역>/` | 영역별 화면 폴더(아래 표). `screens/` 바로 아래에는 여러 영역이 함께 쓰는 시트(구독 안내, 태그 제안)와 프로필 편집 조립 파일만 둠 |
| `src/services/http.ts` | 맛다공 API 공통 요청(`apiRequest`, `API_BASE_URL`): 인증 헤더, JSON·204 처리, `ApiError`(상태 코드), 토큰 만료·401 시 재로그인 한 번만 시작 |
| `src/services/places.ts`, `community.ts` | 장소·기록·하트·최근 본 장소·빠른 기록 / 프로필·취향·맛객·구독·포인트·태그 제안·알림 API. 함수 첫 인자는 항상 `accessToken` |
| `src/services/auth.ts` | 인증 서버 호출: 토큰 교환, 맛다공 가입 상태 조회·가입, 세션 정리 |
| `src/services/kakao.ts`, `regions.ts`, `photos.ts` | 카카오 지도 SDK·장소 검색 / 법정동 지역 목록 / 사진 줄이기 |
| `src/services/registerDraft.ts`, `activity.ts` | 로그인 만료 직전 기록 입력 보관·복원 / 서버 저장 전 버전의 브라우저 기록 읽기(이전용) |
| `src/components/` | 여러 화면이 쓰는 부품. `ui.tsx`(TopBar, NotificationButton, Segmented, SectionHead, EmptyState, Skeleton), `TabBar`, `Sheet`, `NotificationDialog`(확인·안내창, `notify`도 이것을 씀), `PlaceThumb`, `StepProgress`, `MascotArt`, `PaginationDots`, 지도(`MapCanvas`, `mapMarkerArt`), 태그 고르기 |
| `src/hooks/` | 여러 화면이 쓰는 React 훅: `useModalLock`(스크롤 잠금·Esc·포커스 복원), `useSwipe`(포인터 스와이프) |
| `src/models/` | 자료형과 도메인 상수: `place.ts`(Place, Taster, `MY_TASTER_ID`, `placePhoto`), `community.ts`(프로필·구독·알림 등), `tasteTags.ts`(취향 묶음 이름·한도), `region.ts`, 카카오 SDK 전역 타입 |
| `src/utils/` | React와 무관한 계산: `format.ts`(시각·날짜·숫자·원·거리·분류 표시), `storage.ts`(브라우저 저장소 키 `STORAGE_KEYS`와 안전한 읽기·쓰기), `errorMessage.ts`, `placeLinks.ts`(길찾기·공유·카카오맵 주소), `profileMedia.ts`(맛객 사진), `geo.ts`, `accessToken.ts`, `pagination.ts`, `dragScroll.ts`(PC 마우스 끌어 넘기기) |
| `src/theme/` | 색·글꼴·반경 토큰과 시즌 테마 예약([테마 관리](ui/theming.md)) |
| `src/styles/renewal/` | 화면 스타일. `ui.css`(공통 `r-` 부품) + 영역별 파일(`discover.css` 등). 새 스타일은 여기에 둠 |
| `src/styles/` (그 밖) | 리뉴얼 전부터 쓰는 공통 규칙(앱 틀, 아바타, 지도 마커, 프로필 편집·태그 고르기 폼, 로그인 시작 화면) |

## 화면 영역

| 폴더 | 경로(해시) | 화면 |
| --- | --- | --- |
| `discover/` | `#home`, `#map` | 발견: 지도 + 필터 칩 + 장소 카드 넘기기 + 끌어 올리는 목록 시트 |
| `place/` | `#place/<id>` | 맛집 상세: 사진·지도, 빠른 동작, 맛객 기록 카드, 메뉴·정보 탭, 사진 보기 |
| `feed/` | `#feed`, `#notifications` | 피드(스토리·기록 카드), 알림 |
| `record/` | `#register`, `#register/<id>` | 단계형 기록하기와 완료 화면. 단계마다 한 파일, 입력 상태는 역할별 훅(`useRecordPhotos` 등)을 `useRecordForm`이 묶음 |
| `tasters/` | `#tasters`, `#profile/<id>`, `#subscriptions` | 맛객 탐색, 맛객 프로필, 구독 관리 |
| `me/` | `#my`, `#diary`, `#saved`·`#liked`·`#recent`, `#wallet`, `#settings` | 나 홈, 기록 일기(달력), 모음, 포인트 지갑, 계정 설정 |
| `onboarding/` | `#intro`, 가입 | 서비스 소개(`IntroScreen`), 가입 단계(`SignupScreen`: 닉네임 → 취향 → 맛객 추천) |
| `profile-edit/` | `#profile-edit` | 프로필 편집 부품(공개 프로필, 사진·배경, 활동 지역, 취향). `screens/ProfileSettingsScreen.tsx`가 조립 |

하단 탭(발견·피드·기록·맛객·나)은 각 탭의 첫 화면에서만 보이고, 나머지 화면은 상단 바의 뒤로 버튼을 씁니다.

## 데이터와 화면 경계

로그인은 `dagong-auth`를 사용합니다. 맛다공 가입 상태 확인·가입은 인증 서버(`/auth-api`)를, 나머지 API는 API Gateway(`/api`)를 거쳐 장소 서비스 또는 커뮤니티 서비스를 호출합니다. 모든 API 호출은 `services/http.ts`의 `apiRequest`를 거치며, 로그인이 만료되면 `app/signIn.ts`가 등록한 처리기가 현재 주소를 기억하고 다시 로그인합니다. 이때 등록 화면은 작성 중인 입력을 `registerDraft.ts`로 보관합니다.

장소 목록에는 장소 서비스의 개발용 샘플 카탈로그(`p-001` 등)와 사용자가 등록한 장소가 함께 나옵니다. 장소 등록 기록·하트·최근 본 장소·빠른 장소 기록은 장소 서비스 DB에 계정별로 저장됩니다. 비공개 기록 사진은 서명된 `/media/...?exp=&sig=` 주소로 내려오므로 주소가 만료될 수 있습니다. 프로필·취향·구독·포인트·태그 제안·알림은 커뮤니티 API 및 DB에 저장됩니다. 실제 결제 처리는 연결되지 않았고 유료 구독은 개발용 완료 흐름입니다.

샘플 장소의 작성자는 `infra/postgres/dev/seed-community-test-users.sql`의 테스트 맛객(`20000000-0000-4000-8000-00000000000N`)과 같은 ID를 씁니다. `utils/profileMedia.ts`의 기본 사진·배경과 지도 화면의 샘플 장소 위치 이동(`p-\d+`)은 이 샘플 데이터를 위한 것입니다.

이전 버전은 등록·하트·최근 본 장소를 브라우저 localStorage에만 저장했습니다. `app/useLegacyMigration.ts`는 로그인한 계정마다 이 기록을 한 번 서버로 옮기고, 두 이전이 끝나면 이전 저장소를 지웁니다. 옮기기 전까지는 이전 기록도 화면에 함께 보여줍니다.

브라우저 저장소는 화면 편의용 값에만 쓰고, 키와 읽기·쓰기는 모두 `utils/storage.ts`(`STORAGE_KEYS`)를 거칩니다.

- sessionStorage: 로그인 토큰·PKCE 값·돌아갈 주소(`app/signIn.ts`, `http.ts`), 등록 입력 보관과 등록 화면으로 넘기는 일회성 장소(`registerDraft.ts`의 키), 발견 화면의 필터·시트 높이(`discoverModel.ts`)
- localStorage: 계정별 소개 화면 완료 표시, 피드 스토리에서 이미 본 기록(`feedRecords.ts`), 이전 버전 기록과 그 이전 완료 표시

맛객 프로필의 공개 분야·태그와 개인 추천 취향은 별도로 저장합니다. 추천 취향의 제외 조건은 다른 사용자에게 공개하지 않습니다. 가이드 태그는 `tag_group`으로 음식 종류, 맛·메뉴, 카페·디저트, 방문 스타일, 제외 조건을 구분합니다. API에서 필요한 `MENU`/`VISIT` 구분은 해당 그룹에서 계산합니다.

## 수정할 때 지킬 점

- 서버 API는 `services/`의 함수로 호출하고, 새 API 함수도 `apiRequest`를 거치게 합니다. 화면에서 `fetch`를 직접 쓰지 않습니다(정적 지역 파일도 `services/regions.ts`).
- 화면 사이에 값을 넘기거나 보관하는 저장소 키는 `utils/storage.ts`의 `STORAGE_KEYS`에 둡니다. 사용자 기록을 브라우저 저장소에 새로 저장하지 않습니다.
- 서비스 데이터베이스를 다른 서비스가 직접 조회하지 않습니다.
- 반복해서 쓰는 UI는 `components/`, 여러 화면이 쓰는 훅은 `hooks/`, 화면과 무관한 계산은 `utils/`, 자료형·도메인 상수는 `models/`에 두고(같은 일을 영역 안에서 다시 만들지 않음), 화면 전용 배치는 `styles/renewal/<영역>.css`에 둡니다. 클래스는 `r-<영역>-` 접두사를 쓰고, 색·글꼴·반경은 테마 토큰만 씁니다(시즌 테마 교체 때문).
- 파일이나 주요 흐름에 설명이 필요한 경우에만 주석을 두고, 코드에서 바로 알 수 있는 내용을 반복하지 않습니다.
