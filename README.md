# Content Injector

Figma 텍스트 레이어를 JSON으로 일괄 채우는 개발용 플러그인입니다. 레이어 **이름**과 JSON **key**가 같으면 해당 텍스트의 `characters`를 자동으로 바꿉니다.

포트폴리오·이력서·케이스 스터디 템플릿처럼 `profile.name`, `project.1.problem` 같은 고정 key 구조에 맞춰 콘텐츠를 주입할 때 사용합니다.

## 사용 흐름

1. Figma에서 텍스트 레이어 이름을 JSON key와 동일하게 지정합니다.
2. **Plugins → Development**에서 이 플러그인을 실행합니다.
3. UI에 JSON을 붙여넣습니다.
4. **Apply to Figma**를 누릅니다.
5. 현재 페이지에서 이름이 일치하는 Text Layer가 채워지고, 결과 요약이 표시됩니다.

## JSON 예시

레이어 이름 예:

```txt
profile.name
profile.headline
profile.summary
project.1.title
project.1.problem
project.1.action
project.1.result
project.1.insight
```

JSON 예:

```json
{
  "profile.name": "김민찬",
  "profile.headline": "복잡한 도메인을 사용자 흐름으로 바꾸는 프론트엔드 개발자",
  "profile.summary": "AI Agent, 시계열 데이터, 워크플로우 UI를 다뤄온 프론트엔드 개발자입니다.",
  "project.1.title": "Agent UI 공통화",
  "project.1.problem": "프로젝트마다 반복 구현되는 Agent UI로 유지보수 비용이 증가했습니다.",
  "project.1.action": "입력, 실행, 결과 UI를 공통 컴포넌트로 분리했습니다.",
  "project.1.result": "3개 이상 Agent 프로젝트에서 약 60% 코드 재사용을 달성했습니다.",
  "project.1.insight": "UI 단위가 아니라 실행 흐름 단위로 공통화해야 유지보수 비용을 줄일 수 있었습니다."
}
```

- 모든 값은 **문자열**이어야 합니다.
- key는 Figma Text Layer **이름과 정확히 일치**해야 합니다 (대소문자·공백 포함).

## 개발 환경

| 항목 | 요구 사항 |
|------|-----------|
| Figma | **Desktop app** (로컬 manifest 로드용) |
| Node.js | TypeScript 빌드용. 공식 Figma 문서는 특정 버전을 지정하지 않으며, 이 프로젝트의 `typescript` 패키지는 **Node >= 14.17**을 요구합니다. **18 LTS 이상** 권장 |
| npm | `package.json` 스크립트 실행용 |

플러그인 **실행**은 Figma Desktop 런타임에서 이루어지며, 로컬 Node 버전과는 무관합니다.

## 설치 및 빌드

```bash
git clone <repository-url>
cd figma-auto-fill

npm install
npm run build
```

개발 중 자동 재컴파일:

```bash
npm run watch
```

빌드 결과물: `dist/code.js` (`manifest.json`의 `main`이 이 파일을 가리킵니다)

## Figma에 플러그인 등록

1. Figma Desktop 실행
2. **Plugins → Development → Import plugin from manifest...**
3. 이 저장소의 `manifest.json` 선택
4. `src/code.ts`를 수정했다면 `npm run build` 후 플러그인을 다시 실행

## 프로젝트 구조

```txt
figma-auto-fill/
├── manifest.json      # 플러그인 메타데이터
├── package.json
├── tsconfig.json
├── src/
│   ├── code.ts        # 플러그인 메인 (Figma API)
│   └── ui.html        # 플러그인 UI
└── dist/
    └── code.js        # 빌드 출력 (gitignore)
```

## 동작 방식

- **검색 범위**: `figma.currentPage` 전체 (`findAll`)
- **매칭**: `node.type === 'TEXT'` 이고 `node.name`이 JSON key와 일치
- **텍스트 변경**: [Working with Text](https://developers.figma.com/docs/plugins/working-with-text/)에 따라 변경 전 `figma.loadFontAsync()` 호출
- **mixed font**: 레이어에 여러 폰트가 섞여 있으면 구간별 폰트를 로드한 뒤 치환

Apply 후 UI에 다음을 표시합니다.

- 업데이트된 레이어 수·목록
- 실패한 레이어 (폰트 로드 등)
- Figma에서 찾지 못한 JSON key

## MVP에서 지원하는 것

| 기능 | 지원 |
|------|------|
| JSON 붙여넣기 | ✅ |
| Text Layer 이름 기준 매칭 | ✅ |
| 현재 페이지 전체 검색 | ✅ |
| 텍스트 자동 치환 | ✅ |
| mixed font 대응 | ✅ (1차) |
| 매칭 실패 key 리포트 | ✅ |
| 선택 Frame만 치환 | ❌ |
| dry-run / 미리보기 | ❌ |
| 외부 API·ChatGPT 연동 | ❌ |

## 주의사항

### 레이어 이름 = key

`profile.headline` 레이어에는 JSON에도 `"profile.headline"` key가 있어야 합니다.

### 텍스트 스타일

`node.characters = "..."`는 레이어 전체 문자열을 교체합니다. 한 레이어 안에 여러 스타일(굵게 등)이 섞여 있으면 스타일이 단순화될 수 있습니다. 템플릿은 **한 레이어 = 한 역할 = 한 스타일**을 권장합니다.

### 같은 이름의 레이어가 여러 개

현재는 **현재 페이지 전체**를 검색합니다. 같은 이름의 Text Layer가 여러 카드에 있으면 **모두** 같은 값으로 바뀝니다. 다음 개선으로 “선택한 Frame 내부만 치환”을 고려할 수 있습니다.

### Auto Layout·overflow

긴 문단을 넣으면 카드 높이·줄바꿈·overflow를 Figma에서 직접 확인하세요. Text Layer는 Auto Layout 안에서 width를 `Fill container` 등으로 잡아 두는 것이 안전합니다.

## TypeScript 설정 참고

플러그인 메인(`src/code.ts`)용 `tsconfig.json`에서는 **`lib`에 `DOM`을 넣지 않습니다**.  
`DOM`과 `@figma/plugin-typings`가 `console`, `fetch`, `Navigation` 등을 중복 선언해 빌드 에러가 납니다.

UI는 `manifest.json`의 `"ui": "src/ui.html"`과 연결되며, 플러그인 코드에서는 `figma.showUI(__html__)`로 표시합니다. `showUI('')`처럼 빈 문자열을 넘기면 흰 화면만 보입니다. `ui.html`은 `tsc` 빌드 대상이 아닙니다.

## 로드맵 (예정)

1. 선택한 Frame 내부에서만 치환
2. dry-run(미리보기)
3. JSON key 자동 추출 / 레이어 이름 export
4. portfolio / resume / case-study 프리셋
5. 외부 API 연동

## 참고 문서

- [Figma Plugin API – Working with Text](https://developers.figma.com/docs/plugins/working-with-text/)
- [Plugin Quickstart Guide](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/)
- [@figma/plugin-typings](https://github.com/figma/plugin-typings)

## 라이선스

MIT (필요 시 `package.json` / 저장소 설정에 맞게 조정)
