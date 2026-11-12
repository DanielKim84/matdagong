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
| `src/app/App.tsx` | 아래 훅들이 불러온 서버 데이터를 `AppData`로 묶고, 해시 주소에 맞는 화면과 하단 탭을 그림 |
| `src/app/useCommunity.ts`, `useMyPlaces.ts`, `usePlaceSearch.ts`, `recordActions.ts`, `screenViews.ts`, `ProfileEditRoute.tsx` | App에서 나눈 부분: 내 프로필·맛객·구독·포인트 / 내 기록·최근 본 곳·하트·다녀온 곳·별로였던 곳(둘을 합친 방문 근거) / 공개 장소 검색 / 기록 저장·공개 범위 바꾸기·기록 지우기 / 주소별 화면 표(`SCREEN_VIEWS`) / 프로필 설정 주소(`#profile-edit`, `#profile-edit/taste`) |
| `src/app/AppData.tsx` | 화면들이 함께 쓰는 데이터와 동작(하트·별로였어요, 구독, 기록 저장, 프로필 저장, 알림 등). 화면은 props 대신 `useAppData()`로 꺼내 씀 |
| `src/app/useNotifications.ts`, `useLikeChoice.ts`·`LikeChoiceSheet.tsx`, `enrichPlaces.ts`, `accountRole.ts`, `useSignedInDeviceCheck.ts` | App에서 나눈 알림 상태, 하트(빈 하트는 바로 가볼 곳 저장, 찬 하트는 별로였어요·빼기 시트, 별로였던 곳 되돌리기), 장소에 작성자 정보 합치기, 계정 역할 계산, 앱으로 돌아올 때 이 기기 로그인이 아직 유효한지 확인 |
| `src/app/navigation.ts` | 해시 주소(`#화면/ID`)와 앱 내부 뒤로 가기 기록. 화면 목록은 `SCREENS` |
| `src/screens/<영역>/` | 영역별 화면 폴더(아래 표). `screens/` 바로 아래에는 여러 영역이 함께 쓰는 시트(구독 안내, 태그 제안)와 프로필 편집 조립 파일만 둠 |
| `src/services/http.ts` | 맛다공 API 공통 요청(`apiRequest`, `API_BASE_URL`): 인증 헤더, JSON·204 처리, `ApiError`(상태 코드), 토큰 만료·401 시 재로그인 한 번만 시작 |
| `src/services/places.ts`, `community.ts` | 장소·기록·하트·다녀온 곳·별로였던 곳·최근 본 장소·빠른 저장·제보 / 프로필·취향·맛객·구독·포인트·태그 제안·알림·맛객 신고 API([주요 API](api-boundaries.md#주요-api)). 함수 첫 인자는 항상 `accessToken` |
| `src/services/auth.ts` | 인증 서버 호출: 토큰 교환, 맛다공 가입 상태 조회·가입, 세션 정리 |
| `src/services/kakao.ts`, `regions.ts`, `photos.ts` | 카카오 지도 SDK·장소 검색(지금 위치 주변은 `searchNearbyKakaoPlaces`) / 법정동 지역 목록 / 사진 줄이기 |
| `src/services/registerDraft.ts` | 로그인 만료 직전 기록 입력 보관·복원 |
| `src/components/` | 여러 화면이 쓰는 부품. `ui.tsx`(TopBar, NotificationButton, Segmented, SectionHead, EmptyState, Skeleton), `Icon`, `TabBar`, `Sheet`, `NotificationDialog`(확인·안내창, `notify`도 이것을 씀), `PlaceThumb`, `PlaceCard`(맛집 목록 카드), `PlaceTile`(모음·별로였던 곳의 사진 카드, 고르기 모드), `TasteScore`(맛객 옆 신뢰·취향 % 칩), `StepProgress`, `MascotArt`, `PaginationDots`, `BrandAssets`(음식 시안·기본 아바타·내 위치 그림), `FoodFocusPicker`(분야 고르기), 지도(`MapCanvas`, 마커 만들기·묶기 `mapMarkers`, 마커 그림 `mapMarkerArt`, 범위 맞추기 계산 `mapFit`, 내 위치 `useMyLocation`), 기록하기 버튼과 "맛집 기록하기 / 빠른 저장" 메뉴(`RecordMenuButton`), 빠른 저장 시트(`QuickPlaceSheet`), 가게 검색 결과의 검색어 강조(`SearchHighlight`), 태그 고르기(`TasteTagPicker`: 분류마다 흰 줄, 누르면 그 분류 태그를 모두 담은 시트), 분류 아이콘·색(`GroupIcon`, 분류마다 하나로 고정), 태그 하나(`HashTag`: 크림색 칩 + 코랄 #)와 묶음별 태그(`TagGroupList`), 맛객 사진(`TasterAvatar`: 올린 사진, 없거나 깨지면 계정별 기본 캐릭터) |
| `src/hooks/` | 여러 화면이 쓰는 React 훅: `usePageScrollLock`(시트·확인창·전체 화면 창이 함께 쓰는 배경 스크롤 잠금, 겹쳐 열려도 수를 셈), `useModalLock`(전체 화면 창의 잠금·Esc·포커스 복원), `useScrolledPast`(큰 사진이 떠 있는 상단 바 밑으로 지나갔는지), `useSwipe`(포인터 스와이프), `useCurrentLocation`(기록하기·빠른 저장의 주변 가게 검색에 쓸 지금 위치와 안내 문구) |
| `src/models/` | 자료형과 도메인 상수: `place.ts`(Place, Taster, `MY_TASTER_ID`, `placePhoto`), `community.ts`(프로필·구독·알림 등), `trust.ts`(신뢰 등급·정렬·표시 문구), `tasteTags.ts`(취향 분류 8개의 이름·순서·한도, 분야별 분류, 분류별로 묶기), `region.ts`, 카카오 SDK 전역 타입 |
| `src/utils/` | React와 무관한 계산: `format.ts`(시각·날짜·숫자·원·거리·분류 표시), `storage.ts`(브라우저 저장소 키 `STORAGE_KEYS`와 안전한 읽기·쓰기), `errorMessage.ts`, `placeLinks.ts`(길찾기·공유·카카오맵 주소), `profileMedia.ts`(맛객 사진 주소 확인, 계정별 기본 배경 배정), `geo.ts`(좌표·거리, 지금 위치 한 번 받기, 카카오 결과의 좌표·주소), `visitCheck.ts`(지금 위치가 가게 1km 안인지: 내 기록 남기기·별로였어요), `accessToken.ts`, `pagination.ts`, `dragScroll.ts`(PC 마우스 끌어 넘기기), `stableHash.ts`(ID로 늘 같은 기본 사진·색을 고르는 해시) |
| `src/theme/` | 색·글꼴·반경 토큰과 시즌 테마 예약([테마 관리](ui/theming.md)) |
| `src/styles/renewal/` | 화면 스타일. `ui.css`(공통 `r-` 부품) + 영역별 파일(`discover.css` 등). 새 스타일은 여기에 둠 |
| `src/styles/` (그 밖) | 리뉴얼 전부터 쓰는 공통 규칙(앱 틀, 아바타, 지도 마커, 프로필 편집·태그 고르기 폼, 로그인 시작 화면) |

## 화면 영역

| 폴더 | 경로(해시) | 화면 |
| --- | --- | --- |
| `discover/` | `#home`, `#map` | 발견: 지도 + 필터 칩 + 장소 카드 넘기기 + 끌어 올리는 목록 시트. 다른 맛객(구독·구독 안 한)의 기록만 보여 주고 내 기록은 빼고(`discoverPlaces`), 가볼 곳(하트)·별로였던 곳도 빼요(`useDiscoverPlaces`) |
| `mymap/` | `#mymap` | 내 지도(가운데 탭): 내 기록·다녀온 곳·가볼 곳 마커와 전체/가볼 곳/가본 곳 칩(계산은 `myMapModel`), 카카오 전체 검색(`MyMapSearch`). 지도 아래에 지금 보는 지역의 마커를 발견과 같은 카드(`discover/PlaceCarousel`, 사진 위 내 기록·다녀온 곳·가볼 곳 이름표)로 넘겨 보고(카드·목록 범위는 가려진 곳을 뺀 `discover/visibleMapArea`, 구독·취향 % 판단은 발견과 같은 `discover/usePlaceContext`) 그 아래 목록 시트(`discover/DiscoverSheet` + `MyMapSheetList`)로 한 줄씩 보며, 검색 결과는 바로 맛집 상세로 가고, 맛다공에 없는 가게는 `place/kakaoPlaceDetail`의 카카오 가게 상세에서 하트로 가볼 곳 저장(`POST /api/v1/places/wishes`), 기록하기 버튼(`components/RecordMenuButton`) |
| `place/` | `#place/<id>`, `#place/kakao:<카카오 ID>` | 맛집 상세(나와의 관계 뱃지, 별로였어요 되돌리기 포함): 공통 가게 정보 + 맛객 고르기(`PlaceTasterPicker`) + 고른 맛객의 기록(`PlaceTasterRecord`, 메뉴 사진 카드·묶음별 태그), 사진 보기 |
| `feed/` | `#feed`, `#notifications` | 피드(스토리·기록 카드), 알림 |
| `record/` | `#register`, `#register/<id>` | 단계형 기록하기와 완료 화면. 단계마다 한 파일, 입력 상태는 역할별 훅(`useRecordPhotos` 등)을 `useRecordForm`이 묶음 |
| `tasters/` | `#tasters`(나 탭의 "취향 맛객 추천" `#taster-recommendations`도 같은 화면), `#profile/<id>`, `#subscriptions`(`/incoming`이면 나를 구독 탭) | 맛객 탐색(추천·검색), 맛객 프로필, 구독 관리(구독 중·나를 구독 목록은 여기 한 곳), 맛객 신고(`TasterReportButton`) |
| `me/` | `#my`, `#diary`, `#saved`(칩은 `#saved/mine\|private\|wish\|visited`)·`#recent`, `#drafts`, `#disliked`, `#wallet`, `#settings`, `#policy/terms\|privacy` | 나 홈, 기록 일기(달력), 내 맛집 모음(묶음 계산은 `myPlaceCollection`, 내가 등록한 곳·나만 보기 칩에서 공개 범위 바꾸기), 빠른 장소 기록(오늘·최근 7일·그 전으로 묶음), 별로였던 곳(`DislikedPlacesScreen`, 지도에서 뺀 곳 되돌리기), 포인트 지갑, 계정 설정, 이용약관·개인정보 처리방침(본문은 `me/policyDocuments.ts`, 법률 검토 전 초안) |
| `onboarding/` | `#intro`, 가입 | 서비스 소개(`IntroScreen`), 가입 단계(`SignupScreen`: 닉네임 → 취향(찾는 분야 + 그 분야의 태그) → 맛객 추천) |
| `profile-edit/` | `#profile-edit`, `#profile-edit/taste` | 프로필 편집 부품(공개 프로필, 사진·배경, 활동 지역, 취향). `screens/ProfileSettingsScreen.tsx`가 조립 |

하단 탭(발견·피드·내 지도·맛객·나, 내 지도가 가운데 동그란 탭)은 각 탭의 첫 화면에서만 보이고, 나머지 화면은 상단 바의 뒤로 버튼을 씁니다.

## 데이터와 화면 경계

로그인은 `dagong-auth`를 사용합니다. 맛다공 가입 상태 확인·가입은 인증 서버(`/auth-api`)를, 나머지 API는 API Gateway(`/api`)를 거쳐 장소 서비스 또는 커뮤니티 서비스를 호출합니다. 모든 API 호출은 `services/http.ts`의 `apiRequest`를 거치며, 로그인이 만료되면 `main.tsx`가 등록한 처리기가 현재 주소를 기억하고 `app/signIn.ts`로 다시 로그인합니다. 이때 등록 화면은 작성 중인 입력을 `registerDraft.ts`로 보관합니다.

어느 데이터가 어느 서비스에 있는지와 API 경로는 [도메인 및 API 경계](api-boundaries.md)의 [주요 API](api-boundaries.md#주요-api)·[탈퇴](api-boundaries.md#탈퇴)를 기준으로 합니다. 화면 쪽에서 알아 둘 점만 적습니다.

- 장소 목록에는 사용자가 기록하거나 저장한 장소만 나옵니다(개발용 샘플 장소·맛객은 없앴고, 장소가 하나도 없어도 화면은 빈 상태로 그립니다). 기록·하트·다녀온 곳·별로였던 곳·최근 본 장소·빠른 저장·제보는 장소 서비스, 프로필·취향·구독·포인트·태그 제안·알림·맛객 신고는 커뮤니티 서비스에 계정별로 저장됩니다.
- 장소 응답의 기록에는 작성자 사진·캐릭터가 없습니다. `services/places`가 빈 사진·1번 캐릭터로 받아 두고 `app/enrichPlaces`가 커뮤니티 프로필(이름·사진·배경·점수)로 채우며, 프로필을 찾지 못한 맛객은 기본 캐릭터로 보입니다.
- 맛객 신고는 맛객 프로필과 맛집 기록 카드의 `TasterReportButton`(`screens/tasters`)에서 보냅니다. 내가 신고한(확인 전) 맛객은 신고 버튼을 "신고했어요 · 확인 중"으로 막고, 신고가 쌓여 가려진 내 프로필은 나 화면 맨 위에 안내합니다.
- 같은 종류의 다른 기기에서 로그인해 이 기기 로그인이 끝났는지는 게이트웨이(`ActiveLoginFilter`)가 API 요청마다 확인해 401로 막고(답은 토큰별 30초 기억), `useSignedInDeviceCheck`는 앱으로 돌아올 때 가입 상태를 한 번 물어 마지막 접속 시각을 남깁니다.
- 맛다공 탈퇴(설정 맨 아래)는 장소 → 커뮤니티 → 공통 로그인의 맛다공 가입 순서로 지우고 로그아웃합니다. 셋 다 다시 불러도 괜찮습니다.
- 비공개 기록 사진은 서명된 `/media/...?exp=&sig=` 주소로 내려오므로 주소가 만료될 수 있습니다.
- 알림 수신 설정에서 끈 종류의 알림은 서버가 만들지 않습니다.
- 실제 결제 처리는 연결되지 않았고 유료 구독은 개발용 완료 흐름입니다.

배경 사진을 올리지 않은 맛객은 `utils/profileMedia.ts`가 계정 ID로 고른 기본 배경(`default-cover:N`, 그림은 `public/assets/default-covers.png`·`default-cover-5.png`)을, 사진이 없는 맛객은 계정별 기본 캐릭터를 씁니다.

브라우저 저장소는 화면 편의용 값에만 쓰고, 키와 읽기·쓰기는 모두 `utils/storage.ts`(`STORAGE_KEYS`)를 거칩니다.

- sessionStorage: 로그인 토큰·PKCE 값·돌아갈 주소(`app/signIn.ts`, `http.ts`), 등록 입력 보관(`registerDraft.ts`)과 다른 화면이 기록 화면으로 넘기는 일회성 장소, 내 지도 검색에서 고른 카카오 가게(`place/kakaoPlaceDetail.ts`, 새로 고쳐도 상세가 열리게), 발견 화면의 필터·시트 높이(`discoverStorage.ts`), 테마 미리 보기(`?theme=`)
- localStorage: 계정별 소개 화면 완료 표시, 피드 스토리에서 이미 본 기록(`feedRecords.ts`)

맛객 프로필의 공개 분야·태그와 개인 추천 취향은 별도로 저장합니다. 추천 취향의 제외 조건은 다른 사용자에게 공개하지 않습니다. 태그 사전(`GET /api/v1/taste-tags`)과 태그 제안은 태그마다 `tagGroup`(8개 분류) 하나로 나눕니다. 매장 이용 태그는 `VISIT` 분류이고, 나머지 일곱 분류가 취향 태그입니다.

| 분류(`tag_group`) | 화면 이름 | 한 분류에서 고르는 수 | 보이는 분야 |
| --- | --- | --- | --- |
| `CUISINE` | 음식 종류 | 10 | 식당 |
| `TASTE` | 맛·메뉴 | 5 | 식당 |
| `CAFE` | 카페 종류 | 5 | 카페·디저트 |
| `DESSERT` | 디저트·빵 | 10 | 카페·디저트 |
| `TRAVEL` | 여행·드라이브 | 5 | 모두 |
| `MOOD` | 뷰·분위기 | 10 | 모두 |
| `OCCASION` | 이럴 때 | 5 | 모두 |
| `VISIT` | 매장 이용 | 5 | 기록의 매장 이용 정보, 추천 취향의 피하고 싶은 조건 |

- 이름·순서·한도·분야별 분류는 `models/tasteTags.ts` 한 곳에 두고 서버 `TasteTagGroup`(`maxSelections`)·`FoodFocus.allowedGroups`와 같게 맞춥니다. 분야가 "둘 다"면 VISIT을 뺀 일곱 분류이고, 기록하기의 장소 분야(음식점·카페)도 같은 묶음을 씁니다.
- 매장 이용 16개 이름은 `models/place.ts`의 `VISIT_CONDITIONS`(하나만 고르는 묶음은 `VISIT_CONDITION_GROUPS`)에도 있고, 커뮤니티 DB의 VISIT 태그와 반드시 같아야 합니다. `app/enrichPlaces`가 내 제외 조건과 기록의 매장 이용 정보를 이름으로 비교하기 때문입니다. 피하고 싶은 조건으로 고를 수 있는 것은 그중 `AVOIDABLE_VISIT_CONDITIONS` 6개입니다(화면에서만 거름).
- 기록을 저장할 때 `tagGroups`는 태그 사전에서 정하고, 사전에 없는 이름(빠진 옛 태그)은 보내지 않습니다. 탭 저장소에 남은 기록 입력(`registerDraft`)·발견 필터(`discoverStorage`)의 옛 이름도 사전을 기준으로 뺍니다.

## 수정할 때 지킬 점

- 서버 API는 `services/`의 함수로 호출하고, 새 API 함수도 `apiRequest`를 거치게 합니다. 화면에서 `fetch`를 직접 쓰지 않습니다(정적 지역 파일도 `services/regions.ts`).
- 화면 사이에 값을 넘기거나 보관하는 저장소 키는 `utils/storage.ts`의 `STORAGE_KEYS`에 둡니다. 사용자 기록을 브라우저 저장소에 새로 저장하지 않습니다.
- 서비스 데이터베이스를 다른 서비스가 직접 조회하지 않습니다.
- 반복해서 쓰는 UI는 `components/`, 여러 화면이 쓰는 훅은 `hooks/`, 화면과 무관한 계산은 `utils/`, 자료형·도메인 상수는 `models/`에 두고(같은 일을 영역 안에서 다시 만들지 않음), 화면 전용 배치는 `styles/renewal/<영역>.css`에 둡니다. 클래스는 `r-<영역>-` 접두사를 쓰고, 색·글꼴·반경은 테마 토큰만 씁니다(시즌 테마 교체 때문).
- 파일이나 주요 흐름에 설명이 필요한 경우에만 주석을 두고, 코드에서 바로 알 수 있는 내용을 반복하지 않습니다.
