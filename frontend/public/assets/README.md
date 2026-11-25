# 앱 이미지

- `brand/app-icon.png`: 열린 원형 접시·포크 A안 입체 앱 아이콘.
- `brand/brand-logo.png`: A안 한글 가로 로고. 영문·평면·반전형과 배너의 용도는 [브랜드 가이드](brand/README.md)를 따릅니다.
- `brand/characters/chef.png`: 현재 사용하는 셰프 캐릭터 시트.
- `content/covers/`: 프로필 배경 콘텐츠.
- `content/intro/`: 서비스 소개 5장(H안 내용)의 사진 — 쪽마다 큰 사진 `ramen.jpg` · `steak.jpg` · `stew.jpg` · `map-records.jpg` · `room.jpg`와 카드 안 작은 사진(`thumb-ad.jpg`, `thumb-real.jpg`, `taster-minji.jpg`, `pick-1~3.jpg`, `visit-1~3.jpg`, `place-yukmi.jpg`). 원본이 없어 H안 보드(`docs/ui/proposals/intro/H-flow.png`)에서 잘라 2배로 키운 파일이라 조금 흐립니다. 출시 전에 같은 구도의 큰 사진으로 바꿉니다. 같은 폴더의 `cold-noodles.jpg`는 태그 제안 화면 띠, `map.svg`는 지도 마커 안내의 작은 지도 그림에 씁니다.
- 소개 이미지는 `IntroScreen.tsx`에서 사용합니다. 미가입 계정의 가입 전 소개와 설정의 "맛다공 앱 소개"(`#intro`)로 열립니다. 가입 완료 계정은 시작 시 소개를 건너뜁니다.
- `content/sample-food/`: 사진 없는 장소에 사용하는 음식 사진 시트.

브랜드 자료는 [캐릭터·굿즈 소개판](brand/brand-guide.png)과 [로고·색상·여백 사용 가이드](brand/brand-identity.png)를 용도별로 유지합니다. 구버전 비교판은 두지 않습니다.
