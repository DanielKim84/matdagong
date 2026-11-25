# 테마 구조

현재 앱은 밝은 브랜드 A 기본 테마 하나만 사용합니다. 실제 화면 색을 바꿀 필요가 생길 때를 위해 토큰 구조만 유지하며, 시즌 테마·기간 예약·미리보기 테마는 두지 않습니다.

## 파일 역할

```text
frontend/src/theme/
├─ index.css          테마 CSS 진입점
├─ fonts.css          앱 글꼴 가족 Matdagong(보통=티머니 둥근바람, 굵게=주아)
├─ base.css           화면에서 쓰는 의미 토큰과 기본 글꼴
├─ themes/
│  └─ default.css     기본 팔레트·글꼴·반경 토큰
├─ themes.ts          사용 가능한 테마와 브라우저 상단 색
└─ applyTheme.ts      빌드 설정을 읽어 data-theme 적용
```

- `themes/default.css`는 색 계열과 반경 값을 관리합니다.
- `base.css`는 `--color-primary`, `--color-surface`, `--color-ink`처럼 화면 역할을 나타내는 토큰을 팔레트에 연결합니다.
- 화면 CSS는 직접 색을 지정하기보다 의미 토큰을 사용합니다. 현재 기본 화면 배치 규칙은 `styles/screens/`에 둡니다.
- `applyTheme.ts`는 `VITE_APP_THEME`가 등록된 테마 ID일 때 적용하고, 그 외에는 기본 테마를 씁니다. 현재는 기본 테마만 등록되어 있습니다.

## 나중에 테마를 추가할 때

1. `themes/<id>.css`를 만들고 `[data-theme="<id>"]` 범위에서 바뀌는 색 계열·글꼴·반경 토큰만 정의합니다. 정의하지 않은 토큰은 기본값을 이어 씁니다.
2. `index.css`에서 새 테마 파일을 `base.css`보다 먼저 불러옵니다.
3. `themes.ts`의 `THEMES`에 ID와 브라우저 상단 색을 등록합니다.
4. 필요하면 개발 환경의 `VITE_APP_THEME=<id>`로 확인합니다. 등록하지 않은 ID는 기본 테마로 처리됩니다.

대비와 색의 역할은 [현재 UI 기준](current-design.md#색-역할)을 따릅니다. 테마를 추가할 때 화면별 CSS를 복사하거나 기존 화면 스타일을 고치지 않고 토큰만 조정합니다.
