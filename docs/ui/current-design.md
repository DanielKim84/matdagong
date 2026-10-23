# 최신 시안 기준

기준: 사용자가 마지막으로 제공한 `845b6696-8f04-438e-91f8-643ed899c9db.png`. 이전 시안·캐릭터·페이지·스타일 파일은 삭제했습니다.

## 적용한 화면 구성

- PC에서도 앱 폭 430px를 유지합니다. 모바일에서는 가로폭에 맞추며 큰 웹 배너와 데스크톱 메뉴를 추가하지 않습니다.
- 홈: 로고·검색·알림 → 추천/구독/광고 → 음식 사진 배너 → 둥근 음식 아이콘 → 두 열 사진 카드 → 하단 탭.
- 지도: 검색과 표시 설정 → 추천/구독/광고 → 실제 지도 → 하단 장소 카드.
- 필터: 내 구독 맛객/다른 맛객/광고 3개 스위치, 보라/프로필/광고 마커 안내, 적용 버튼.
- 맛집 등록: 사진 최대 10장, 이름, 주소·지도 좌표, 추천 이유 500자, 대표 메뉴 5개, 태그 5개, 공개 범위.
- 상세: 큰 음식 사진, 이름과 평가, 주소·영업 정보, 지도/길찾기, 소개/메뉴/사진/태그/위치정보.
- 프로필: 커버, 원본 마커 프로필, 소개·활동 수·구독, 세 열 사진 목록.
- 마이: 원본 기본 프로필, 크림색 포인트 카드, 네 칸 통계, 붉은 원형 메뉴 아이콘.
- 시작·온보딩·로그인: 원본의 요리사·음식·지도·구독·포인트·광고 일러스트와 같은 순서.

## 색상

메인 `#FF3B3B`, 주황 강조 `#FF5A31`, 소프트 주황 `#FFE5D5`, 크림 `#FFF4E6`, 중립 그레이 `#8895A7`, 본문 네이비·차콜. 지도 구독 마커는 최신 시안의 보라색을 사용합니다.

## 소재

- `frontend/public/assets/design-reference.png`: 제공한 마지막 시안 원본.
- `frontend/public/assets/pin-other.svg`, `pin-subscribed.svg`, `pin-ad.svg`, `app-icon.svg`: 원본 소재의 표시 영역을 지정한 SVG. 이전에 새로 그렸던 캐릭터를 재사용하지 않습니다.
- `frontend/public/assets/food-photos.png`: 시안의 그릴 음식 사진 분위기에 맞춰 내장 image_gen으로 생성한 2열×2행 사진 소재. 실제 가게 사진이 아닙니다. CLI나 로컬 API 키를 사용하지 않았습니다.
- `frontend/public/assets/profile-cover.png`: 시안의 맛객 프로필 커버 분위기를 참고해 내장 image_gen으로 생성한 순수 배경 이미지. 상태 표시줄·검색 아이콘 등 원본 UI가 이미지에 섞이지 않도록 분리했습니다.

원본 시안의 UI 이미지를 통째로 화면에 넣지 않습니다. 입력, 버튼, 탭, 장소 카드, 지도, 필터와 등록은 React 요소로 작성했습니다. 원본에서 재사용한 부분은 로고·캐릭터·핀·일러스트 소재입니다.

## 생성한 음식 사진의 프롬프트

```text
Create a restaurant food photography asset atlas, 2 columns by 2 rows of exactly equal square photographs, total 1024x1024. Input image is visual reference only: reproduce the appetizing food photography mood of the food cards and restaurant detail hero in the supplied Korean app design sheet. Row1 col1: a sizzling Korean grilled beef steak platter, sliced juicy meat with glossy cherry tomatoes, mushrooms, baby potatoes, carrots, vivid green vegetables, dark cast iron skillet on warm restaurant wood table. Row1 col2: spicy Korean stir-fried chicken with sesame and vegetables in black shallow pan. Row2 col1: Korean grilled pork barbecue with vegetables and tiny side dishes. Row2 col2: spicy seafood stir-fry, prawns and mussels with vegetables, served in black pan. Rich warm natural lighting, dark restaurant background, saturated appetizing food, premium food photography. Each cell separate close-up image filling the square, centered plated dish, no dividers, no text, no logos, no icons, no interface, no people. Match the grilled beef hero photography of the provided app sheet, not the cartoon rendering.
```

## 확인용 주소

프로필 커버 생성 프롬프트:

```text
Create a clean high resolution landscape cover background for a Korean food sharing app user profile. The input is the app design reference, use ONLY the colorful travel village landscape that appears behind the mascot avatar in screen 06 맛객 프로필 화면 as visual style reference. Generate a wide panoramic beautiful small alpine village with red and orange rooftops, green terraced fields, bright spring flowers in foreground, turquoise blue sky, distant snowy mountains, rich cheerful colors, slightly dreamy miniature tilt shift photography, premium 3D scenic illustration matching the small profile cover reference. Edge to edge image. NO user interface, NO text, NO logos, NO mascot, NO person, NO map marker, NO status bar, NO phone frame, NO search icon, NO battery or signal icons. Landscape 3:1 composition, keep distant mountains top half and vibrant village and flowers lower half. This image is only the decorative cover behind the functional app UI, not an app screenshot.
```

- `http://www.localhost:4845/`: 실제 앱. 임시 화면 비교 HTML과 확인용 스크린샷은 정리했습니다.
- `/#home`, `/#map`, `/#register`, `/#my`, `/#intro`, `/#login`: 개별 화면.
- Kakao Developers Web 플랫폼 허용 도메인에 www.localhost:4845를 등록해야 합니다.

기본 지도 동작은 [카카오 지도 공식 문서](https://apis.map.kakao.com/web/documentation/)의 SDK를 사용합니다.

## 연결 범위

## 로고 소재

`frontend/public/assets/brand-logo.png`는 제공된 워드마크를 참고해 배경 없이 분리한 PNG입니다. 내장 이미지 생성 도구를 사용했습니다.

```text
Use case: background-extraction, identity-preserve. Extract ONLY the exact Korean brand wordmark '맛다공' shown near the top of the first welcome phone (second column) in this provided design reference. Preserve the lettering faithfully: very thick rounded friendly dark chocolate brown Korean '맛' and '공', vivid red-orange '다', orange-red sweeping lower stroke of '맛', little white chef hat with dark brown outline above the final '공', and tiny orange accent next to hat. Output the isolated original brand logo as a clean high resolution transparent PNG, horizontal ratio about 2:1, centered with 6% transparent padding. No background whatsoever, no cream rectangle, no kitchen, no mascot, no tagline, no phone, no other words. Do not invent a new logo, don't change spelling or type shapes. Text must be exactly 맛다공, same visual identity as the attached reference. This is a clean cutout/export of the supplied wordmark for use in the app header.
```

최종 확인: TypeScript 및 Vite 빌드 성공. www.localhost에서 지도 드래그, 마커 상세 이동, 필터 8→2곳 변경을 확인했습니다. 별도 127.0.0.1 브라우저 저장소에서 등록 후 새로고침 유지와 메뉴 표시를 확인했습니다. 로그인과 포인트 서버 처리는 연결 전입니다.

기존 장소 API 계약은 유지합니다. 등록·좋아요·스크랩·구독은 이 브라우저의 체험 데이터입니다. 광고 데이터가 없으면 빈 목록을 보여줍니다. 로그인·리뷰 저장·서버 공유·포인트 거래는 연결 전이며 포인트 잔액은 0입니다. 화면의 평점·팔로워 수와 음식 사진은 예시입니다.
