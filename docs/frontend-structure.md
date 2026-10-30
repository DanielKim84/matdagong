# 프런트엔드 구조

React 화면, 서버 API 호출, 탭·브라우저에 잠시 남기는 값을 분리합니다. 사용자 기록은 서버(API Gateway 뒤의 각 서비스)에 저장합니다.

```text
index.html → src/main.tsx (로그인·가입 확인) → src/app/App.tsx → src/screens/*
                                                      ├→ services/places.ts    → services/http.ts → API Gateway → 장소 서비스
                                                      ├→ services/community.ts → services/http.ts → API Gateway → 커뮤니티 서비스
                                                      ├→ services/kakao.ts → 카카오 지도 SDK·장소 검색
                                                      ├→ services/registerDraft.ts → sessionStorage (등록 입력 보관)
                                                      ├→ services/activity.ts → localStorage (이전 버전 기록 읽기 전용)
                                                      └→ components/*, models/*, utils/*
```

## 주요 파일

| 경로 | 책임 |
| --- | --- |
| `src/main.tsx` | 공통 인증(Authorization Code + PKCE) 로그인, 맛다공 가입 확인, 소개·가입·앱 화면 선택. 로그인 전 주소(`#place/<id>` 등)를 기억했다가 로그인 뒤 복원하고, 로그인 만료 처리기를 등록 |
| `src/app/App.tsx` | 화면 전환과 API 결과를 화면에 연결. 이전 브라우저 기록의 서버 이전도 여기서 실행 |
| `src/app/navigation.ts` | 해시 주소(`#화면/ID`)와 앱 내부 뒤로 가기 기록 |
| `src/screens/` | 홈, 지도, 장소 상세·등록, 프로필, 마이, 알림, 구독, 설정, 소개·가입 화면 |
| `src/services/http.ts` | 맛다공 API 공통 요청(`apiRequest`): 인증 헤더, JSON·204 처리, 오류 메시지, 토큰 만료·401 시 재로그인 한 번만 시작 |
| `src/services/places.ts` | 장소·내 기록·하트·최근 본 장소·빠른 장소 기록 API 호출과 형식 변환 |
| `src/services/community.ts` | 프로필·취향·맛객·구독·포인트·태그 제안·알림 API 호출 |
| `src/services/kakao.ts` | 카카오 지도 SDK 로드와 장소 키워드 검색 |
| `src/services/photos.ts` | 등록할 사진을 줄여 data URL로 변환 |
| `src/services/registerDraft.ts` | 로그인 만료 직전의 맛집 등록 입력을 sessionStorage에 보관했다가 재로그인 뒤 한 번 복원. 다른 화면이 등록 화면에 장소를 넘기는 키도 정의 |
| `src/services/activity.ts` | 서버 저장 전 버전이 localStorage에 남긴 등록·하트·최근 본 장소를 읽기만 함(서버 이전용) |
| `src/components/` | 지도, 마커, 사진, 아이콘, 시트·확인창·알림 등 재사용 UI |
| `src/models/` | 장소·태그 자료형과 카카오 SDK 전역 타입 |
| `src/utils/` | 토큰 payload 읽기, 거리 계산, 스와이프, 페이지 점, 샘플 맛객 기본 이미지 |
| `src/styles/` | 전역 색상·공통 UI와 화면별 배치 |

## 데이터와 화면 경계

로그인은 `dagong-auth`를 사용합니다. 맛다공 가입 상태 확인·가입은 인증 서버(`/auth-api`)를, 나머지 API는 API Gateway(`/api`)를 거쳐 장소 서비스 또는 커뮤니티 서비스를 호출합니다. 모든 API 호출은 `services/http.ts`의 `apiRequest`를 거치며, 로그인이 만료되면 `main.tsx`가 등록한 처리기가 현재 주소를 기억하고 다시 로그인합니다. 이때 등록 화면은 작성 중인 입력을 `registerDraft.ts`로 보관합니다.

장소 목록에는 장소 서비스의 개발용 샘플 카탈로그(`p-001` 등)와 사용자가 등록한 장소가 함께 나옵니다. 장소 등록 기록·하트·최근 본 장소·빠른 장소 기록은 장소 서비스 DB에 계정별로 저장됩니다. 비공개 기록 사진은 서명된 `/media/...?exp=&sig=` 주소로 내려오므로 주소가 만료될 수 있습니다. 프로필·취향·구독·포인트·태그 제안·알림은 커뮤니티 API 및 DB에 저장됩니다. 실제 결제 처리는 연결되지 않았고 유료 구독은 개발용 완료 흐름입니다.

샘플 장소의 작성자는 `infra/postgres/dev/seed-community-test-users.sql`의 테스트 맛객(`20000000-0000-4000-8000-00000000000N`)과 같은 ID를 씁니다. `utils/profileMedia.ts`의 기본 사진·배경과 지도 화면의 샘플 장소 위치 이동(`p-\d+`)은 이 샘플 데이터를 위한 것입니다.

이전 버전은 등록·하트·최근 본 장소를 브라우저 localStorage에만 저장했습니다. `App.tsx`는 로그인한 계정마다 이 기록을 한 번 서버로 옮기고, 두 이전이 끝나면 이전 저장소를 지웁니다. 옮기기 전까지는 이전 기록도 화면에 함께 보여줍니다.

브라우저 저장소는 화면 편의용 값에만 씁니다.

- sessionStorage: 로그인 토큰·PKCE 값·돌아갈 주소(`main.tsx`, `http.ts`), 등록 입력 보관과 등록 화면으로 넘기는 일회성 장소(`registerDraft.ts`의 키), 지도 분류 탭
- localStorage: 계정별 소개 화면 완료 표시, 이전 버전 기록과 그 이전 완료 표시

맛객 프로필의 공개 분야·태그와 개인 추천 취향은 별도로 저장합니다. 추천 취향의 제외 조건은 다른 사용자에게 공개하지 않습니다. 가이드 태그는 `tag_group`으로 음식 종류, 맛·메뉴, 카페·디저트, 방문 스타일, 제외 조건을 구분합니다. API에서 필요한 `MENU`/`VISIT` 구분은 해당 그룹에서 계산합니다.

## 수정할 때 지킬 점

- 서버 API는 `services/`의 함수로 호출하고, 새 API 함수도 `apiRequest`를 거치게 합니다. 화면에서 `fetch`를 직접 쓰는 곳은 정적 파일(`public/data/kr-legal-dong.json`)을 읽는 경우뿐입니다.
- 화면 사이에 값을 넘기거나 보관하는 저장소 키는 한 모듈에 상수로 두고 함께 씁니다(예: `registerDraft.ts`의 등록 화면 전달 키). 사용자 기록을 브라우저 저장소에 새로 저장하지 않습니다.
- 서비스 데이터베이스를 다른 서비스가 직접 조회하지 않습니다.
- 반복해서 쓰는 UI는 `components/`, 화면과 무관한 계산은 `utils/`에 두고, 화면 전용 배치는 해당 화면 스타일에 둡니다.
- 파일이나 주요 흐름에 설명이 필요한 경우에만 주석을 두고, 코드에서 바로 알 수 있는 내용을 반복하지 않습니다.
