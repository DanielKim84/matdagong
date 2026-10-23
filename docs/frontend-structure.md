# 프런트엔드 파일 안내

이전 페이지와 스타일을 제거하고 최신 시안에 맞춰 새로 작성한 구조입니다.

```text
index.html → src/main.tsx → src/app/App.tsx → src/screens/화면.tsx
                                          ├→ src/services/places.ts → API Gateway → matdagong-place-service
                                          ├→ src/services/activity.ts → localStorage
                                          ├→ src/components/공통화면.tsx
                                          └→ src/models/place.ts
```

## 먼저 읽을 파일

1. `src/main.tsx`: React를 HTML의 root에 연결하고 CSS를 읽습니다.
2. `src/app/App.tsx`: API 결과·선택한 화면·상세·사용자 활동을 화면에 연결합니다.
3. `src/app/navigation.ts`: `#home`, `#map`, `#place/장소ID`처럼 주소로 화면을 구분합니다. 브라우저 뒤로가기도 동작합니다.
4. `src/screens/HomeScreen.tsx`: 공통 컴포넌트를 사용해 홈의 실제 배치를 구성합니다.
5. `src/services/places.ts`: 백엔드 호출과 화면 코드를 분리합니다.

## 화면 파일

| 파일 | 역할 |
| --- | --- |
| HomeScreen | 음식 배너, 추천·구독·광고 탭, 음식 종류, 맛집 카드 |
| MapScreen | 검색, 지도 필터, 지도, 하단 목록 |
| RegisterScreen | 사진 10장, 이름, 주소·좌표, 추천 이유, 메뉴·태그 5개, 공유 설정 |
| PlaceScreen | 사진, 평가·스크랩, 지도·길찾기, 소개·메뉴·사진·태그·위치 |
| ProfileScreen | 맛객 커버·마커, 프로필, 구독, 사진 피드 |
| MyScreen | 기본 프로필, 포인트, 4개 활동 수, 메뉴 목록 |
| CollectionScreen | 스크랩·좋아요·최근 본 장소·내 등록, 구독 목록과 알림 |
| IntroScreen | 시작, 다섯 온보딩 화면과 로그인 UI |
| SettingsScreen | 소개와 로그인으로 이동, 현재 체험 기능 안내 |

## 공통과 연결

- `components/BrandAssets.tsx`: 로고는 투명 PNG로 표시하고, 기본 프로필·일러스트·마커는 제공된 시안의 SVG 뷰포트로 표시합니다.
- `components/Icon.tsx`: 크기·선 굵기를 통일한 아이콘.
- `components/AppChrome.tsx`: 상단, 하단 5개 탭과 추천·구독·광고 탭.
- `components/PlaceTile.tsx`: 맛집 카드와 평점 예시.
- `components/MapCanvas.tsx`: 실제 카카오 지도와 마커, 현재 위치, 등록할 좌표 선택.
- `components/Sheet.tsx`: Esc, 포커스 이동, 배경 스크롤 잠금을 처리하는 공통 팝업.
- `services/activity.ts`: 스크랩·좋아요·구독·등록·최근 본 장소를 브라우저에 저장합니다.
- `services/photos.ts`: 선택한 사진을 브라우저에서 압축해 저장 공간을 줄입니다.
- `services/kakao.ts`: 카카오 SDK를 중복 로드하지 않습니다.
- `models/place.ts`: 서버 장소와 로컬 등록 데이터의 모양.
- `models/kakao.d.ts`: 이 앱이 사용하는 지도 SDK의 타입.

`styles/app.css`는 공통 색상·탭·버튼·팝업, `styles/screens.css`는 화면별 배치를 담당합니다. PC도 시안과 같은 앱 폭을 유지하고 안쪽에서 스크롤합니다. 모바일에서는 화면 너비에 맞춰집니다.

## 샘플과 실제 연결

장소 목록과 상세·검색은 서버 API에서 가져옵니다. 사용자 API는 아직 없으므로 장소 응답에 포함된 기록자를 맛객 프로필로 사용합니다.

맛집 등록·좋아요·스크랩·구독은 로컬 체험 기능입니다. 브라우저 origin별로 저장되며 다른 사용자나 기기와 동기화되지 않습니다. 사진·평점·팔로워 수는 디자인 샘플입니다. 로그인·포인트 거래와 리뷰 저장은 서버 연동 전입니다.
