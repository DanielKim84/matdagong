# 서비스와 데이터 경계

브라우저는 API Gateway를 호출하고, 각 서비스는 자신이 소유한 데이터만 읽고 씁니다. 서비스 간 계정 연결은 공통 계정 UUID로 하고, 별도 데이터베이스에 걸친 외래 키는 만들지 않습니다. 다른 서비스의 데이터가 필요하면 DB가 아니라 그 서비스의 API를 호출합니다.

| 도메인 | 서비스 | 데이터 책임 |
| --- | --- | --- |
| 공통 계정·소셜 로그인 | `dagong-auth` | 공통 사용자 ID, 소셜 계정 연결, 차단·탈퇴 상태 |
| 맛객·커뮤니티 | `matdagong-community-service` | 서비스 프로필·취향·배경 사진, 구독·구독 회차 이력, 태그 사전·제안, 포인트 원장, 알림함·알림 설정, 맛객 신고 |
| 장소·지도 | `matdagong-place-service` | 가게 기본정보, 맛객별 기록·메뉴·사진, 하트(가볼 곳)·다녀온 곳·별로였던 곳, 최근 본 장소, 빠른 저장, 가게 정보 제보 |
| API 진입점 | `matdagong-api-gateway` | `/api/v1/**`와 `/media/**` 요청 전달, 로그인 중인 토큰인지 확인(`ActiveLoginFilter`). 도메인 데이터를 저장하지 않음 |

## 현재 흐름

공통 로그인은 `dagong-auth`가 처리합니다. 맛다공은 로그인 토큰의 공통 계정 UUID로 커뮤니티 API를 호출해 프로필·취향·구독 상태를 읽고, 지도와 장소 정보는 Gateway를 거쳐 장소 API에서 가져옵니다. 장소 기록·하트·다녀온 곳·별로였던 곳·최근 본 장소는 계정별로 장소 DB에 저장되어 기기 간에 공유됩니다(화면은 이 값들을 브라우저에 따로 두지 않습니다).

서비스 간 직접 호출은 네 가지입니다.

- 장소 → 커뮤니티 `GET /api/v1/users/me/profile`: 기록을 저장할 때 사용자의 토큰으로 작성자 닉네임과 신고로 가려졌는지(`hiddenByReports`)를 가져옵니다. 요청 본문의 작성자 정보는 받지 않고, 작성자 캐릭터·사진은 화면이 커뮤니티 프로필에서 채웁니다.
- 커뮤니티 → 장소 `GET /api/v1/places/{id}`: 화면이 보낸 장소 ID로 본인 기록과 공개 여부를 확인한 뒤 맛집 등록 알림을 만듭니다. 알림 제목·내용·중복 방지 키는 서버가 정합니다.
- 커뮤니티 → 장소 `GET /api/v1/places/trust-stats`: 맛객 목록을 만들 때 사용자의 토큰으로 같은 맛집 경험 신뢰 재료(인정·엇갈림·태그 일치)를 받습니다. 화면은 이 경로를 직접 부르지 않고 `GET /tasters`의 `trustScore`만 읽습니다.
- 장소 → 커뮤니티 `GET /internal/v1/hidden-tasters`: 30초마다 신고로 가린 맛객 목록을 받습니다(아래 [신고로 가린 맛객](#커뮤니티-db의-주요-테이블) 설명).

### 직접 다녀온 곳 확인

직접 다녀온 곳만 근거로 남기도록, 장소 서비스는 요청의 `deviceLocation`(`{ latitude, longitude }`)이 가게와 1km 안인지 다시 확인합니다(`location/NearbyPlaceGuard`, 가게 좌표는 카카오 확인 값 → DB 값 → 요청 값 순).

- **빠른 저장**(`POST /api/v1/places/drafts`): 늘 1km 안이어야 합니다. 저장하면 다녀온 곳(`user_place_visits`, `QUICK_SAVE`)이 됩니다.
- **새 기록**(`POST /api/v1/places/records`): 이 가게가 다녀온 곳이면 위치 없이 받고, 아니면 1km 안이어야 합니다. 빠른 저장과 기록은 늘 다녀온 곳을 함께 남기므로 빠른 저장에서 이어 쓰기, 내 기록 수정, 지운 기록 다시 남기기가 모두 여기에 듭니다. 기록하면 다녀온 곳(`RECORD`)이 되고, 같은 장소의 빠른 저장·하트·별로였던 곳 표시는 지웁니다(하트한 곳을 기록할 때는 화면이 직접 다녀왔는지 먼저 묻습니다).
- **별로였어요**(`PUT /api/v1/places/{placeId}/dislike`): 방문 근거(다녀온 곳·이미 남긴 별로였던 곳)가 있거나 1km 안이어야 합니다. 화면은 `GET /places/visits`와 `GET /places/dislikes`를 합쳐 같은 근거를 알아봅니다(`useMyPlaces`). 내 기록이 있는 곳은 고를 수 없습니다.

기기 위치는 결국 브라우저가 보내는 값이라 위치 조작까지는 막지 못하고, 화면을 거치지 않은 요청을 걸러 냅니다.

### 가게·추천·구독·태그

여러 맛객이 같은 가게를 등록하면 `restaurant_places` 한 행을 함께 씁니다. 가게 기본정보는 장소 서비스가 카카오 Local API로 같은 장소 ID를 확인했을 때만 갱신하고, 확인하지 못한 요청 값은 새 가게를 만들 때만 저장합니다.

맛객 추천은 선택 분야와 공개 취향 태그를 사용자의 비공개 선호 태그와 비교합니다. 취향 일치율(`GET /tasters`의 `matchScore`)은 내 좋아요 태그를 분류별로 묶어 그 맛객 분야에서 고를 수 있는 분류만 세고, 분류마다 겹친 비율을 같은 무게로 평균 냅니다(내가 추천 분야를 정했으면 분야 일치도 분류 하나처럼 넣음, 커뮤니티 `TasteMatch`). 피하고 싶은 조건은 매장 이용(`VISIT`) 태그만 고르며 `user_preference_tags.preference_type = 'AVOID'`로 저장합니다. 이 단계는 태그 일치 기반이며 AI 분석을 전제하지 않습니다.

구독 관계와 회차별 이력은 분리되어 있습니다. 관계 테이블은 현재 구독 상태를 조회하고, 이력 테이블은 무료·유료 유형, 선택 기간, 적용 금액과 이용 기간을 회차별로 보존합니다. 무료 구독은 사용자당 활성 한 건이며 새 무료 구독을 선택하면 기존 무료 구독을 교체합니다. 유료 기간은 1·3·6·12개월입니다. 현재 결제 처리는 개발용 즉시 완료 흐름입니다.

태그 사전은 `tag_group` 하나를 분류 기준으로 사용합니다(V39). `CUISINE`(음식 종류)·`TASTE`(맛·메뉴)는 식당, `CAFE`(카페 종류)·`DESSERT`(디저트·빵)는 카페, `TRAVEL`(여행·드라이브)·`MOOD`(뷰·분위기)·`OCCASION`(이럴 때)은 모든 분야에서 고르고, `VISIT`(매장 이용)은 기록의 매장 이용 조건과 피하고 싶은 조건에만 씁니다. 분류마다 고를 수 있는 수(음식 종류·디저트·빵·뷰·분위기 10개, 나머지 5개)는 공통 `TasteTagGroup.maxSelections`가 정하고 화면 `models/tasteTags.ts`도 같은 값을 씁니다. 매장 이용 태그 이름은 장소 서비스 `restaurant_record_visit_conditions`의 조건 이름과 같아야 합니다(화면이 이름으로 비교). 태그 API(`GET /taste-tags`, 태그 제안 응답)는 이름과 `tagGroup`만 돌려주고, 매장 이용 태그인지는 `tagGroup`이 `VISIT`인지로 구분합니다(따로 저장·응답하는 상위 분류는 없음).

## 커뮤니티 DB의 주요 테이블

| 테이블 | 역할 |
| --- | --- |
| `user_profiles` | 공통 계정 UUID에 연결된 맛다공 프로필, 활동 분야·지역, 프로필 사진과 자기소개 |
| `user_profile_cover_photos` | 맛객 프로필 배경 사진(최대 10장)과 표시 순서 |
| `taste_tags` | 공개 프로필·추천 취향·피하고 싶은 조건이 함께 쓰는 태그 사전(8개 분류 `tag_group`). 장소 서비스 기록 태그·매장 이용 조건은 이 이름과 같게 저장 |
| `user_profile_tags` | 맛객이 공개 프로필에 선택한 태그 |
| `user_preference_tags` | 사용자가 비공개 추천을 위해 고른 태그. `LIKE`(좋아요, 취향 % 계산)와 `AVOID`(피하고 싶은 조건, 매장 이용 태그만) |
| `taste_tag_requests` | 사용자가 제안한 태그·매장 이용 정보와 관리자 검토 결과 |
| `user_subscriptions` | 사용자와 맛객 사이의 현재 구독 관계 |
| `user_subscription_history` | 구독 회차별 유형·기간·금액 이력 |
| `user_point_history` | 포인트 적립·사용·조정 원장. 잔액은 거래 합계로 계산 |
| `user_notifications` | 사용자별 알림 스냅샷과 읽음 상태. 90일 보관, 사용자가 지울 수 있고 탈퇴하면 받은 알림과 그 계정을 가리키는 새 구독자 알림을 지움 |
| `user_notification_settings` | 알림 종류별 받기 설정. 행이 없으면 새 기록·새 구독자 켬, 서비스 소식 끔. 끈 종류의 알림은 서버가 만들지 않음 |
| `taster_reports` | 맛객 신고(이유·설명·신고한 기록의 장소). 설명은 모든 이유에서 꼭 받고 DB도 빈 설명을 막습니다(V43). 기록에서 신고해도 올린 맛객에게 쌓고, 확인 전(PENDING) 신고는 신고한 사람·맛객마다 한 건 |
| `taster_moderations` | 신고 누적 처리 상태. 확인 전 신고 3명(불법·음란 사진은 1건)이면 `review_requested_at`(관리자 확인 목록), 5명이면 `hidden_at`(자동 가림) |

프로필의 공통 계정 UUID는 인증 DB가 소유하므로 이 DB에서 외래 키를 걸지 않습니다.

**신고로 가린 맛객**: 커뮤니티 서비스는 맛객 목록·프로필·배경 사진에서 바로 빼고, 내 프로필 응답에 `hiddenByReports: true`를 담습니다(장소 서비스는 이 값으로 새 기록·수정을 403으로 막음). 장소 서비스는 서비스 간 주소 `GET /internal/v1/hidden-tasters`(게이트웨이 경로에 없어 화면에서는 닿지 않음)를 30초마다 읽어, 본인이 아닌 사람에게 그 맛객의 기록·기록 수·공개 사진을 빼고 보여 줍니다. 그래서 가린 뒤 지도·피드에서 빠지기까지 최대 30초쯤 걸립니다. 운영에서는 커뮤니티 서비스 포트를 밖에 열지 않아야 합니다.

## 장소 DB의 주요 테이블

| 테이블 | 역할 |
| --- | --- |
| `restaurant_places` | 지도 제공자 장소 ID로 중복을 합친 가게 기본정보 |
| `restaurant_records` | 맛객별 추천 이유와 공개 범위. 계정마다 가게 하나에 기록 하나. 작성자 닉네임은 저장 시점의 커뮤니티 프로필 값(캐릭터는 저장하지 않음, V16) |
| `restaurant_record_menus` | 기록의 추천 메뉴·가격과 선택 메뉴 사진 |
| `restaurant_record_tags` | 기록의 취향 태그와 분류(`VISIT` 제외 7개). 기록 저장 때 태그마다 `tagGroups`로 분류를 받고, 없거나 모르는 분류·`VISIT`이면 400으로 거부합니다 |
| `restaurant_record_visit_conditions` | 직접 방문해 확인한 매장 이용 조건. 이름은 커뮤니티 매장 이용(`VISIT`) 태그 16개와 같아야 하고, 장소 서비스가 저장 전에 같은 목록(`PlaceRecordModels.VISIT_CONDITIONS`)으로 검사해 다른 이름은 400으로 거부합니다(DB CHECK는 두지 않음) |
| `restaurant_record_photos` | 기록 사진과 표시 순서 |
| `user_place_likes` | 계정별 하트(가볼 곳, 한 가지뿐). 예전 "다녀왔어요 · 입맛에 맞았어요" 하트는 V12에서 다녀온 곳(`HEART`)으로 옮겼고, V18에서 하트 종류 칼럼(`save_origin`)과 함께 없앴습니다. 내 지도 검색으로 고른 카카오 가게는 `POST /api/v1/places/wishes`가 가게를 저장한 뒤 하트로 넣습니다(방문 확인 없음, 기록 없는 가게는 저장한 사람에게만 보임) |
| `user_place_dislikes` | 다녀왔지만 별로였던 곳(V10). 발견·내 지도의 지도 마커에서만 빼고, 경험 신뢰에서 엇갈림으로 셉니다. 한 장소는 하트와 별로였던 곳 중 하나만 됩니다 |
| `user_place_visits` | 다녀온 곳(V12). `visit_source`: QUICK_SAVE(빠른 저장, 그 빠른 저장을 지우면 빠짐), RECORD(기록한 적 있음, 기록을 지워도 남음), HEART(예전 다녀왔어요 하트에서 옮긴 행. 새로 만들지 않고, RECORD처럼 빠른 저장을 지워도 남음). 다녀온 곳은 위치 확인 없이 기록할 수 있습니다. `GET /api/v1/places/visits` |
| `user_recent_places` | 계정별 최근 본 장소. 15일, 최대 30곳 |
| `place_quick_drafts` | 빠른 저장: 기록을 나중에 이어 쓰려고 담아 둔 장소(가게 1km 안에서만). 기본 키는 계정·제공자·제공자 장소 ID(한 가게는 한 번만 담음). 저장할 때 가게를 `restaurant_places`에도 만들어 둡니다(기록이 없으면 저장한 사람에게만 보임) |
| `place_reports` | 가게 기본정보 오류·폐업 제보와 확인 상태(RECEIVED·APPLIED·REJECTED). 확인 전 같은 사람·장소·이유는 한 건. 확인·반영하는 관리자 화면은 아직 없어 운영자가 DB에서 처리합니다 |

사용자가 실제로 등록한 장소와 맛객별 추천 기록은 장소 도메인의 데이터입니다. 화면 개발용 샘플 장소와 더미 계정은 장소 V15·커뮤니티 V40에서 지웠습니다. 하트·별로였던 곳·다녀온 곳·최근 본 장소·제보의 `place_id`는 `restaurant_places.place_id`를 가리키는 UUID 외래 키입니다(V16, 예전 샘플 장소 ID 때문에 두었던 문자열 칸을 바꿈). API는 장소 ID를 문자열로 주고받고, UUID가 아니거나 없는 장소 ID로 하트·별로였어요를 남기면 400("저장할 맛집을 확인해 주세요."), 상세·최근 본 곳·제보·기록 지우기는 404입니다.

## 주요 API

화면은 Gateway(`/api`)를 거쳐 부릅니다. 화면 쪽 호출 함수는 `frontend/src/services/places.ts`, `community.ts`에 있습니다.

| 서비스 | 경로(`/api/v1` 아래) | 하는 일 |
| --- | --- | --- |
| 장소 | `GET /places?q=`, `GET /places/{id}` | 검색, 상세 |
| 장소 | `GET /places/records/mine`, `POST /places/records` | 내 기록 목록, 새 기록·수정(하트한 곳도 같은 경로) |
| 장소 | `PUT /places/records/visibility`(`{ placeIds, visibility }`), `DELETE /places/records/{placeId}` | 여러 기록의 공개 범위 한 번에 바꾸기, 내 기록 지우기(가게 정보·하트는 남음) |
| 장소 | `GET /places/likes`, `PUT /places/{placeId}/like`, `POST /places/wishes` | 하트(가볼 곳) 목록·저장·풀기, 카카오 가게를 가볼 곳으로 저장 |
| 장소 | `GET /places/dislikes`, `PUT /places/{placeId}/dislike` | 별로였던 곳 목록·남기기·되돌리기 |
| 장소 | `GET /places/visits` | 다녀온 곳 |
| 장소 | `GET /places/drafts`, `GET /places/drafts/check`, `POST /places/drafts`, `DELETE /places/drafts/{providerPlaceId}` | 빠른 저장 목록·중복 확인·저장·지우기 |
| 장소 | `GET`·`POST /places/recent` | 최근 본 장소 |
| 장소 | `POST /places/{placeId}/reports`(`{ reason, memo }`) | 가게 정보 제보. 응답 `{ duplicate }`는 확인 전 같은 제보가 이미 있었는지 |
| 장소 | `DELETE /places/me` | 탈퇴: 내 장소 데이터 지우기 |
| 커뮤니티 | `/users/me/profile`(`GET`·`POST`·`PUT`, `avatar`, `avatar/social`, `covers`, `nickname-availability`), `DELETE /users/me` | 내 프로필·사진·배경, 가입 때 소셜 프로필 사진 가져오기, 닉네임 미리 확인, 탈퇴 |
| 커뮤니티 | `GET /tasters`, `GET /taste-tags`, `/taste-tags/requests` | 맛객 목록·취향 일치율, 태그 사전, 태그 제안 |
| 커뮤니티 | `/subscriptions`(`plans`, `subscribers`, `POST`, `DELETE /{subscriptionId}`), `GET /points` | 구독·요금·나를 구독, 포인트 내역 |
| 커뮤니티 | `/notifications`(`settings`, `place-recorded`, 읽음·지우기) | 알림함, 알림 설정(`{ tasterNewPlace, newSubscriber, serviceNews }`), 맛집 등록 알림 만들기 |
| 커뮤니티 | `POST /tasters/{tasterId}/reports`(`{ reason, memo, placeId }`, 204), `GET /users/me/taster-reports` | 맛객 신고, 내가 신고한(확인 전) 맛객 |

`GET /places/trust-stats`는 커뮤니티 서비스만 부르는 서비스 간 경로입니다(위 [현재 흐름](#현재-흐름)). 사용자의 토큰으로 그 사람 자신의 재료만 돌려주므로 게이트웨이 `/api/v1/places/**`에 함께 열려 있어도 다른 사람 데이터는 보이지 않습니다.

## 탈퇴

맛다공 탈퇴는 각 서비스가 자기 데이터만 지우고, 화면이 순서대로 부릅니다. 셋 다 다시 불러도 괜찮아 중간에 실패하면 다시 시도합니다.

1. 장소 `DELETE /api/v1/places/me`: 기록(메뉴·태그·방문 조건·사진 포함), 하트, 별로였던 곳, 다녀온 곳, 최근 본 장소, 빠른 저장, 제보. 여러 맛객이 함께 쓰는 가게 행은 남깁니다.
2. 커뮤니티 `DELETE /api/v1/users/me`: 프로필·취향·배경 사진, 내가 한·받은 구독과 회차 이력, 알림·알림 설정, 포인트 내역, 태그 제안, 내가 낸 신고·나를 향한 신고와 처리 상태.
3. `dagong-auth` `DELETE /api/v1/matdagong/membership`: 맛다공 가입을 `WITHDRAWN`으로 바꾸고, 이 계정이 맛다공 client로 받은 로그인 기록 `oauth2_authorization`을 지웁니다. 브라우저 공개 client라 refresh token이 없어 새 토큰을 더 받을 수 없고, 이미 받은 access token은 만료(기본 30분)까지 형식상 유효합니다. 이 브라우저의 토큰은 화면이 로그아웃하며 지웁니다.

공통 계정·소셜 연결은 다른 다공 서비스가 함께 쓰므로 남기고, 다시 로그인하면 맛다공 가입 절차부터 시작합니다. 구독자들이 받은 "새 기록" 알림 문구처럼 내 계정 ID 없이 저장된 스냅샷은 90일 보관 뒤 정리됩니다.

## 변경 원칙

- 한 서비스가 다른 서비스의 DB를 직접 조회하지 않습니다.
- 구독 회차·포인트처럼 이력과 정산 근거가 되는 데이터는 덮어쓰지 않고 거래 단위로 보존합니다.
- Flyway 스크립트는 적용 후 수정·삭제하지 않고 새 버전으로 변경합니다.
- 서비스가 안정적인 ID와 API 계약으로 연결되도록 합니다.
