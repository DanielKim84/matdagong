# 테마(시즌 분위기) 관리

맛다공 화면의 색과 제목 글꼴은 `frontend/src/theme`에 모아 둔 테마 패키지에서 정합니다. 화면 CSS는 색을 직접 쓰지 않고 테마 변수만 쓰므로, 테마 하나를 바꾸면 앱 전체 분위기가 함께 바뀝니다. 할로윈·크리스마스처럼 기간을 정해 분위기를 바꿨다가 기간이 끝나면 기본 디자인으로 자동 복원할 수 있습니다.

## 구성

```text
frontend/src/theme/
├─ index.css          테마 패키지 진입점(main.tsx에서 가장 먼저 불러옴)
├─ base.css           테마와 무관한 의미 토큰(--color-ink, --color-primary …)과 기본 글꼴
├─ themes/
│  ├─ default.css     기본 테마(A 시안 · 웜 다이어리)
│  └─ halloween.css   할로윈 예시 테마
├─ themes.ts          테마 목록(이름, 상단 색, 제목 글꼴)과 기간 예약
└─ applyTheme.ts      적용할 테마를 고르고 <html data-theme>에 반영
```

A 시안 화면 모양은 테마 토큰만 쓰는 아래 파일에 있습니다. 시즌 테마는 이 파일들을 고치지 않고 토큰 값만 바꿉니다.

- `frontend/src/styles/design-a.css`: 제목 글꼴, 홈 상단, 맛집 상세, 맛객 프로필, 지도 상단
- `frontend/src/styles/a/home-lists.css`: 홈 하단(배너·내 취향 맛객·인기 맛집 카드), 맛집 모음, 맛객 추천
- `frontend/src/styles/a/my.css`: 마이, 구독 관리, 포인트, 알림, 설정
- `frontend/src/styles/a/forms.css`: 맛집 등록, 빠른 기록, 프로필 편집, 취향 태그 선택, 태그 제안
- `frontend/src/styles/a/overlays.css`: 공통 화면 헤더, 하단 시트, 확인창·안내창, 구독 안내 시트, 지도 목록, 서비스 소개, 첫 가입

## 색 체계

색은 계열별로 0(가장 밝음)~900(가장 어두움) 단계 변수로 정의합니다.

| 계열 | 쓰임 |
| --- | --- |
| `--neutral-*` | 바탕, 선, 본문 글자 |
| `--brand-*` | 주요 버튼, 선택 상태, 강조(기본 테마는 코랄) |
| `--clay-*` | 채도가 낮은 갈색·살구 장식 |
| `--amber-*` | 포인트 배지(기본 테마는 허니 앰버) |
| `--green-*`, `--slate-*`, `--blue-*`, `--berry-*` | 지도, 알림, 카테고리 구분 |
| `--shadow-color` | 그림자와 사진 위 어두운 막 |
| `--on-strong` | 진한 색이나 사진 위 글자색 |

화면 CSS는 가능하면 `base.css`의 의미 토큰(`--color-primary`, `--color-ink` 등)을 쓰고, 세밀한 단계가 필요할 때만 계열 단계 변수를 직접 씁니다. 반투명 색은 `color-mix(in srgb, var(--brand-600) 30%, transparent)`처럼 만듭니다. 새 CSS에 `#ffffff` 같은 색 값을 직접 쓰지 않습니다.

## 시즌 테마 추가

1. `themes/<id>.css`를 만들고 `[data-theme="<id>"] { … }` 안에서 바꿀 계열 단계 변수만 다시 정의합니다. 단계별 밝기 순서(0 밝음 → 900 어두움)를 지켜야 글자와 바탕 대비가 유지됩니다. `--brand-600` 위 흰 글자는 4.5:1 대비 이상이어야 합니다.
2. 제목 글꼴을 바꾸려면 같은 블록에서 `--font-display`를 바꿉니다.
3. 장식이 필요하면 같은 파일에 `[data-theme="<id>"] .클래스` 규칙으로 배경 무늬나 작은 그림을 더합니다. 이미지는 CSS `data:` SVG나 `public/assets` 파일을 씁니다.
4. `themes/index.css`에 `@import "./themes/<id>.css";`를 추가합니다(`base.css`보다 위).
5. `themes.ts`의 `THEMES`에 `{ id, label, themeColor, fontStylesheet }`를 등록합니다. `fontStylesheet`는 Google Fonts css2 주소입니다(CSP가 Google Fonts를 허용합니다).

## 적용과 복원

적용 순서는 다음과 같습니다.

1. **미리 보기**: 주소에 `?theme=<id>`를 붙이면 그 탭에서만 해당 테마로 봅니다. `?theme=auto`로 미리 보기를 끕니다.
2. **배포 강제 지정**: 프런트 빌드 환경 변수 `VITE_APP_THEME=<id>`. 기간과 관계없이 그 테마를 씁니다. 비우면 다음 단계로 넘어갑니다.
3. **기간 예약**: `themes.ts`의 `THEME_SCHEDULE`에 한국 시간 기준 시작일(포함)·종료일(미포함)을 넣습니다.

   ```ts
   export const THEME_SCHEDULE: readonly ThemeSchedule[] = [
     { theme: "halloween", start: "2027-10-01", end: "2027-11-01" },
   ];
   ```

   기간 안에 앱을 열면 할로윈 테마가 적용되고, 종료일 0시 이후에는 다시 배포하지 않아도 기본 테마로 돌아갑니다.
4. 위 조건이 없으면 기본 테마(`default`)를 씁니다.

## 지금 상태

- 기본 테마: A 시안(웜 다이어리). 크림 바탕, 접근성 대비를 맞춘 코랄(`#cf3f25`), 허니 앰버, 제목 글꼴 Jua, 본문 글꼴 Pretendard.
- 할로윈 테마: 예시로만 등록되어 있고 기간 예약은 비어 있습니다. `http://localhost:4845/?theme=halloween`으로 미리 볼 수 있습니다.
- 음식 일러스트(`BrandAssets.tsx`의 SVG)와 사진은 테마와 관계없이 원래 색을 유지합니다.
