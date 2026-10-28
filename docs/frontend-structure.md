# 프런트엔드 구조

React 화면, 서버 API, 브라우저에 남기는 기록을 분리합니다.

```text
index.html → src/main.tsx → src/app/App.tsx → src/screens/*
                                      ├→ services/places.ts → API Gateway → 장소 서비스
                                      ├→ services/community.ts → API Gateway → 커뮤니티 서비스
                                      ├→ services/activity.ts → 브라우저 저장소
                                      └→ components/*, models/*
```

## 주요 파일

| 경로 | 책임 |
| --- | --- |
| `src/main.tsx` | React 시작점과 전역 스타일 연결 |
| `src/app/App.tsx` | 화면 전환과 API 결과를 화면에 연결 |
| `src/app/navigation.ts` | 화면 주소와 브라우저 뒤로 가기 처리 |
| `src/screens/` | 홈, 지도, 장소 상세, 프로필, 설정, 소개 등 화면 |
| `src/services/places.ts` | 장소 API 호출 |
| `src/services/community.ts` | 프로필·취향·맛객·구독·포인트 API 호출 |
| `src/services/activity.ts` | 등록·좋아요·최근 본 장소의 브라우저 저장 |
| `src/components/` | 지도, 마커, 사진, 아이콘, 공통 팝업 등 재사용 UI |
| `src/models/` | 장소와 태그 API 자료형 |
| `src/styles/` | 전역 색상·공통 UI와 화면별 배치 |

## 데이터와 화면 경계

로그인은 `dagong-auth`를 사용합니다. 화면에서 호출하는 API는 API Gateway를 거쳐 장소 서비스 또는 커뮤니티 서비스로 전달됩니다.

장소 목록과 상세는 현재 장소 서비스의 샘플 카탈로그에서 제공합니다. 장소 등록·좋아요·최근 본 장소는 브라우저별 저장 데이터여서 다른 기기와 공유되지 않습니다. 프로필·취향·구독·포인트와 태그 제안은 커뮤니티 API 및 DB에 저장됩니다. 실제 결제 처리는 연결되지 않았고 유료 구독은 개발용 완료 흐름입니다.

맛객 프로필의 공개 분야·태그와 개인 추천 취향은 별도로 저장합니다. 추천 취향의 제외 조건은 다른 사용자에게 공개하지 않습니다. 가이드 태그는 `tag_group`으로 음식 종류, 맛·메뉴, 카페·디저트, 방문 스타일, 제외 조건을 구분합니다. API에서 필요한 `MENU`/`VISIT` 구분은 해당 그룹에서 계산합니다.

## 수정할 때 지킬 점

- 화면은 API나 브라우저 저장소를 직접 다루지 않고 `services/` 함수를 사용합니다.
- 서비스 데이터베이스를 다른 서비스가 직접 조회하지 않습니다.
- 반복해서 쓰는 UI는 `components/`에 두고 화면 전용 배치는 해당 화면 스타일에 둡니다.
- 파일이나 주요 흐름에 설명이 필요한 경우에만 주석을 두고, 코드에서 바로 알 수 있는 내용을 반복하지 않습니다.
