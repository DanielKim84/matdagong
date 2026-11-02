# AI 작업 지침 (맛다공)

Claude Code, Codex 등 AI 도구는 이 저장소에서 작업하기 전에 이 파일을 따릅니다. 사람도 같은 규칙을 따릅니다.

## 먼저 읽을 문서

- 코딩 스타일: [docs/coding-style.md](docs/coding-style.md) — 서식은 도구가 정하고, 이름·구조·주석 규칙은 이 문서를 따릅니다.
- 개발 환경(다른 PC 세팅 포함): [docs/home-development-setup.md](docs/home-development-setup.md)
- 화면 구조: [docs/frontend-structure.md](docs/frontend-structure.md), UI 기준: [docs/ui/current-design.md](docs/ui/current-design.md)
- 공통 로그인은 같은 상위 폴더의 `dagong-auth` 저장소입니다.

## 꼭 지킬 것

- 사용자에게 하는 답변·진행 안내·주석·문서는 **한국어**로 씁니다. 작업 중인지 끝났는지 분명히 알립니다.
- 디자인은 밝은 분위기를 유지합니다(다크 계열 제안 금지, 요청이 있을 때만).
- 비밀 값(.env, .env.local, 키 파일)을 출력·커밋하지 않고, `.env.example`에 실제 값을 넣지 않습니다. `.env` 수정은 사용자 허락 후에만.
- 이미 적용된 Flyway 마이그레이션은 고치지 않고 새 버전 파일을 추가합니다.
- 포트(4840·4845·5840·5843·5844·5845)와 `localhost` 접속 주소를 바꾸지 않습니다. 사용자가 이미 띄운 서버가 있으면 같은 포트로 또 띄우지 않습니다.
- 커밋·푸시는 사용자가 요청할 때만 합니다.

## 작업을 마치기 전에

```powershell
npm.cmd run format            # 화면 서식 (저장소 루트)
.\gradlew.bat spotlessApply   # Java 서식 (저장소 루트)
cd frontend; npx tsc --noEmit -p .; cd ..
.\gradlew.bat test
```
