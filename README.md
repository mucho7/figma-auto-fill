# Content Injector

Figma 텍스트 레이어를 JSON으로 일괄 채우는 개발용 플러그인입니다. 레이어 **이름**과 JSON **key**가 같으면 해당 텍스트의 `characters`를 자동으로 바꿉니다.

포트폴리오·이력서·케이스 스터디 템플릿처럼 `profile.name`, `project.1.problem` 같은 고정 key 구조에 맞춰 콘텐츠를 주입할 때 사용합니다.

현재는 이력서·경력기술서·커버레터처럼 반복적으로 수정되는 문서에서, 지원 회사별 문구를 빠르게 교체하기 위한 목적을 우선합니다.

## 사용 흐름

### 콘텐츠 주입 (Apply)

1. Figma에서 텍스트 레이어 이름을 JSON key와 동일하게 지정합니다.
2. **Plugins → Development**에서 이 플러그인을 실행합니다.
3. UI에 JSON을 붙여넣습니다.
4. **Apply to Figma**를 누릅니다.
5. 현재 페이지에서 이름이 일치하는 Text Layer가 채워지고, 결과 요약이 표시됩니다.

### 로컬 JSON 불러오기

자주 사용하는 이력서·포트폴리오 문구를 로컬 JSON 파일로 저장해두고 다시 불러올 수 있습니다.

1. 로컬 환경에 JSON 파일을 준비합니다.
2. 플러그인 UI에서 **Load JSON**을 누릅니다.
3. 파일을 선택하면 JSON 내용이 입력 영역에 채워집니다.
4. 필요한 경우 내용을 수정한 뒤 **Apply to Figma**를 누릅니다.

> 플러그인 main code가 직접 로컬 파일 시스템에 접근하지 않습니다.  
> 로컬 파일은 UI의 `<input type="file">`을 통해 읽고, 읽은 JSON 문자열을 Figma plugin main으로 전달하는 구조를 사용합니다.

### 초기 세팅: 텍스트로 레이어 이름 지정

placeholder 텍스트만 채워 두고 레이어 이름을 아직 정하지 않았을 때 사용합니다.

1. Text Layer에 JSON **value**와 동일한 텍스트를 입력해 둡니다.
2. UI에 동일한 JSON을 붙여넣습니다.
3. **텍스트로 이름 지정**을 누릅니다.
4. 현재 페이지에서 텍스트가 value와 **정확히 일치**하는 Text Layer의 이름이 key로 바뀝니다.
5. 이후 **Apply to Figma**로 콘텐츠를 일괄 치환할 수 있습니다.

## JSON 설계 원칙

### 1. page 정보는 key에 넣지 않습니다

문서의 각 세션은 가독성을 위해 1페이지를 넘지 않도록 관리합니다. 따라서 `page1`, `page2` 같은 현재 배치 정보는 key에 포함하지 않습니다.

```txt
// 사용하지 않음
resume.page1.summary.body
career.page2.company.01.project.01.title

// 사용
resume.summary.body
career.company.01.project.01.title
```

페이지 정보는 디자인 배치에 가깝고, `resume`, `career`, `cover`는 텍스트의 의미에 가깝습니다. 레이아웃이 바뀌어도 key가 유지되도록 의미 단위로 관리합니다.

### 2. 변경 가능한 텍스트만 JSON으로 관리합니다

모든 텍스트를 JSON으로 관리하지 않습니다. 지원 회사마다 바뀌는 문장, 프로젝트 설명, 커버레터 본문처럼 수정 가능성이 높은 영역만 JSON으로 관리합니다.

#### JSON으로 관리하는 영역

```txt
resume.profile.headline
resume.summary.body
resume.skills.01
resume.tools.01.label
resume.tools.01.value
resume.experience.company.01.project.01.text
career.company.01.project.01.problem
cover.section.01.text
```

#### Figma 템플릿에 고정해도 되는 영역

```txt
직군, 이름
Blog 주소, Email 주소
각종 섹션의 제목
Education 내부의 내용
```

단, 회사별 지원 전략에 따라 바뀔 수 있는 `Tool`의 카테고리명과 기술 스택은 JSON으로 관리합니다.

### 3. Figma Text Layer 단위와 JSON key 단위를 맞춥니다

Figma에서 하나의 Text Layer라면 JSON도 하나의 key로 관리합니다.

예를 들어 `resume.experience.company.01.project.01` 영역이 제목과 본문으로 보이더라도, 실제 Figma에서 하나의 Text Layer라면 `title`과 `body`로 나누지 않습니다.

```json
{
  "resume.experience.company.01.project.01.text": "Agent UI 공통화 및 재사용 구조 설계\n\n서로 다른 Agent 프로젝트 3개에서 반복되던 입력 폼·실행 상태·결과 표시 UI를 공통화\n재사용 가능한 구조로 설계해 약 60% 수준의 코드 재사용률을 달성"
}
```

마찬가지로 Cover Letter의 섹션 본문도 여러 문단처럼 보이더라도 실제 Figma에서 하나의 Text Layer라면 `paragraph.01`, `paragraph.02`로 나누지 않고 `text` 하나로 관리합니다.

```json
{
  "cover.section.01.text": "첫 번째 문단입니다.\n\n두 번째 문단입니다.\n\n세 번째 문단입니다."
}
```

### 4. Tool 내부 기술 스택은 배열로 쪼개지 않습니다

Tool 영역의 기술 스택은 하나의 문자열로 관리합니다. 줄바꿈이 필요한 경우 `\n`을 포함합니다.

```json
{
  "resume.tools.01.label": "Dev",
  "resume.tools.01.value": "React · TypeScript · TailwindCSS\nTanStack Query · Zustand"
}
```

아래처럼 기술 스택을 배열로 분해하지 않습니다.

```json
{
  "resume.tools.01.value": ["React", "TypeScript", "TailwindCSS"]
}
```

## JSON 예시

레이어 이름 예:

```txt
resume.profile.headline
resume.summary.body
resume.skills.01
resume.tools.01.label
resume.tools.01.value
resume.experience.company.01.name
resume.experience.company.01.project.01.text
career.company.01.project.01.title
career.company.01.project.01.problem
cover.section.01.title
cover.section.01.text
```

JSON 예:

```json
{
  "resume.profile.headline": "한 줄 소개 문구 (직무·강점 요약)",

  "resume.summary.body": "이력서 상단 요약 본문입니다.\n\n2~3문장으로 경력 방향, 핵심 역량, 지원 직무와의 연결점을 적습니다.",

  "resume.skills.01": "핵심 역량 항목 1",
  "resume.skills.02": "핵심 역량 항목 2",
  "resume.skills.03": "핵심 역량 항목 3",
  "resume.skills.04": "핵심 역량 항목 4",
  "resume.skills.05": "핵심 역량 항목 5",

  "resume.tools.01.label": "카테고리명 (예: Dev)",
  "resume.tools.01.value": "기술 스택 1줄\n필요 시 줄바꿈으로 2줄 이상 표기",
  "resume.tools.02.label": "카테고리명 (예: Infra)",
  "resume.tools.02.value": "도구·플랫폼 목록",
  "resume.tools.03.label": "카테고리명 (예: Collaboration)",
  "resume.tools.03.value": "협업 도구 목록",

  "resume.experience.company.01.name": "회사명",
  "resume.experience.company.01.description": "회사·서비스 한 줄 설명",
  "resume.experience.company.01.period": "YYYY.MM — YYYY.MM (또는 재직중)",
  "resume.experience.company.01.project.01.text": "프로젝트 제목\n\n이력서용 압축 요약 2~3줄. Figma에서 하나의 Text Layer라면 title/body key로 나누지 않고 text 하나로 관리합니다.",

  "career.company.01.name": "회사명",
  "career.company.01.period": "YYYY.MM — YYYY.MM",
  "career.company.01.description": "경력기술서용 회사·담당 업무 설명",
  "career.company.01.project.01.title": "프로젝트 제목",
  "career.company.01.project.01.problem": "문제 상황 (Problem)",
  "career.company.01.project.01.decision": "판단·의사결정 (Decision)",
  "career.company.01.project.01.action_result": "실행 내용과 결과 (Action & Result)",
  "career.company.01.project.01.insight": "배운 점·인사이트 (Insight)",

  "cover.profile.headline": "커버레터 상단 한 줄 소개",
  "cover.section.01.title": "섹션 제목 (예: 지원 동기)",
  "cover.section.01.text": "섹션 본문 첫 문단입니다.\n\n문단 구분은 \\n\\n을 사용합니다.\n\n지원 회사·직무에 맞게 수정하는 긴 본문을 하나의 text key로 넣습니다."
}
```

* 모든 값은 **문자열**이어야 합니다.
* key는 Figma Text Layer **이름과 정확히 일치**해야 합니다. 대소문자·공백 포함.
* 줄바꿈은 `\n`을 사용합니다.
* 하나의 Text Layer에 여러 문단이 들어가는 경우 `\n\n`으로 문단을 구분합니다.

## Resume / Career 얼라인 규칙

이력서 요약 영역과 경력기술서 상세 영역은 같은 회사·프로젝트 번호를 공유합니다.

```txt
resume.experience.company.{x}.project.{y}.text
career.company.{x}.project.{y}.title
career.company.{x}.project.{y}.problem
career.company.{x}.project.{y}.decision
career.company.{x}.project.{y}.action_result
career.company.{x}.project.{y}.insight
```

예를 들어 아래 두 key는 같은 프로젝트를 가리킵니다.

```txt
resume.experience.company.01.project.01.text
career.company.01.project.01.title
```

즉, `company.01.project.01`은 resume에서는 압축 요약 문장으로, career에서는 PDRI 상세 문장으로 표현됩니다.

### Career 상세 문장 구조

Career 상세는 다음 4개 필드를 기준으로 관리합니다.

```txt
problem
decision
action_result
insight
```

* `problem`: 문제 상황
* `decision`: 판단 기준 또는 기술적 의사결정
* `action_result`: 실행 내용과 결과
* `insight`: 배운 점 또는 확장 가능한 인사이트

현재 템플릿에서는 `action`과 `result`를 분리하지 않고 `action_result` 하나로 관리합니다. 문장 길이와 Figma 공간 제약을 고려한 결정입니다.

## Project Content Bank

자주 사용하는 프로젝트 문장을 로컬 JSON 파일로 저장해두고, 필요한 프로젝트만 선택해 Figma 주입용 JSON으로 변환하는 기능을 계획합니다.

이 기능은 회사별 완성본을 저장하는 방식이 아니라, **프로젝트별 문장 조각을 저장하는 방식**입니다.

### 목표

```txt
project-bank.json
→ 프로젝트 선택
→ companyId 기준으로 그룹핑
→ resume/career key 자동 생성
→ Apply to Figma
```

### project-bank.json 예시

```json
{
  "version": "0.1.0",
  "projects": [
    {
      "id": "agent-ui-commonization",
      "companyId": "ahha-labs",
      "companyName": "(주) 아하랩스",
      "companyPeriod": "2024.11 — 재직중",
      "companyResumePeriod": "2024.11 재직중",
      "companyDescription": "제조 AI MLOps 플랫폼 (DAISY) / CNC 관제 대시보드",
      "companyResumeDescription": "제조 AI MLOps 플랫폼 / CNC 관제 대시보드",
      "title": "Agent UI 공통화 및 재사용 구조 설계",
      "resumeText": "Agent UI 공통화 및 재사용 구조 설계\n\n서로 다른 Agent 프로젝트 3개에서 반복되던 입력 폼·실행 상태·결과 표시 UI를 공통화\n재사용 가능한 구조로 설계해 약 60% 수준의 코드 재사용률을 달성",
      "career": {
        "problem": "고객사별 Agent 웹앱 요구가 늘어나며 입력 폼, 실행 상태, 결과 표시 등 반복 UI와 로직을 프로젝트마다 중복 구현해야 하는 문제가 발생",
        "decision": "프로젝트별 요구사항은 분리하되, 반복되는 인터랙션과 상태 처리 로직은 공통화해야 대응 속도와 유지보수성을 함께 높일 수 있다고 판단",
        "action_result": "공통 컴포넌트와 Hook을 분리해 별도 패키지로 배포했고, 약 60% 수준의 코드 재사용률 달성",
        "insight": "공통화는 반복되는 요구사항과 달라질 수밖에 없는 요구사항을 구분하는 설계 작업이라는 점을 배움"
      },
      "tags": ["Agent UI", "공통화", "React", "TypeScript", "재사용"]
    }
  ]
}
```

### Project Bank 변환 규칙

선택된 프로젝트는 `companyId` 기준으로 그룹핑됩니다.

```txt
ahha-labs
  - agent-ui-commonization
  - large-timeseries-visualization

tmax-cloud
  - gaia-px
  - tcp-iaas
```

변환 후에는 아래와 같은 flat JSON이 생성됩니다.

```json
{
  "resume.experience.company.01.name": "(주) 아하랩스",
  "resume.experience.company.01.description": "제조 AI MLOps 플랫폼 / CNC 관제 대시보드",
  "resume.experience.company.01.period": "2024.11 재직중",
  "resume.experience.company.01.project.01.text": "Agent UI 공통화 및 재사용 구조 설계\n\n...",

  "career.company.01.name": "(주) 아하랩스",
  "career.company.01.period": "2024.11 — 재직중",
  "career.company.01.description": "제조 AI MLOps 플랫폼 (DAISY) / CNC 관제 대시보드",
  "career.company.01.project.01.title": "Agent UI 공통화 및 재사용 구조 설계",
  "career.company.01.project.01.problem": "...",
  "career.company.01.project.01.decision": "...",
  "career.company.01.project.01.action_result": "...",
  "career.company.01.project.01.insight": "..."
}
```

### Project Bank MVP 정책

* 저장 파일명 예시: `project-bank.json`
* 최상위 구조: `{ version, projects }`
* 프로젝트는 `id`, `companyId`, `title`, `resumeText`, `career`, `tags`를 가진다.
* 회사 정보는 각 프로젝트 내부에 중복 저장한다.
* 선택한 프로젝트 순서를 기준으로 `company.01`, `project.01` 번호를 생성한다.
* 같은 `companyId`를 가진 프로젝트는 같은 company 번호를 공유한다.
* 회사당 최대 3개 프로젝트 선택을 기본 정책으로 한다.
* `resumeText`는 자동 생성하지 않고 직접 저장한다.
* `career`는 `problem`, `decision`, `action_result`, `insight`를 사용한다.

## 개발 환경

| 항목      | 요구 사항                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------ |
| Figma   | **Desktop app** (로컬 manifest 로드용)                                                                                  |
| Node.js | TypeScript 빌드용. 공식 Figma 문서는 특정 버전을 지정하지 않으며, 이 프로젝트의 `typescript` 패키지는 **Node >= 14.17**을 요구합니다. **18 LTS 이상** 권장 |
| npm     | `package.json` 스크립트 실행용                                                                                            |

플러그인 **실행**은 Figma Desktop 런타임에서 이루어지며, 로컬 Node 버전과는 무관합니다.

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

### Apply (이름 → 텍스트)

* **검색 범위**: `figma.currentPage` 전체 (`findAll`)
* **매칭**: `node.type === 'TEXT'` 이고 `node.name`이 JSON key와 일치
* **텍스트 변경**: [Working with Text](https://developers.figma.com/docs/plugins/working-with-text/)에 따라 변경 전 `figma.loadFontAsync()` 호출
* **mixed font**: 레이어에 여러 폰트가 섞여 있으면 구간별 폰트를 로드한 뒤 치환

Apply 후 UI에 다음을 표시합니다.

* 업데이트된 레이어 수·목록
* 실패한 레이어 (폰트 로드 등)
* Figma에서 찾지 못한 JSON key

### 텍스트로 이름 지정 (텍스트 → 이름)

* **검색 범위**: `figma.currentPage` 전체 (`findAll`)
* **매칭**: `node.type === 'TEXT'` 이고 `node.characters`가 JSON value와 **정확히 일치**
* **이름 변경**: `node.name = key` (폰트 로드 불필요)
* **중복 매칭**: 동일 value를 가진 Text Layer가 **2개 이상**이면 해당 key는 스킵하고 결과에 표시

이름 지정 후 UI에 다음을 표시합니다.

* 이름이 변경된 key 수·목록
* 텍스트와 일치하는 레이어가 없는 key
* 중복 매칭으로 스킵한 key

### Load JSON

* **입력 방식**: 플러그인 UI에서 로컬 JSON 파일 선택
* **처리 방식**: UI에서 파일을 읽어 textarea에 표시
* **적용 방식**: 기존 Apply 흐름과 동일하게 key와 Text Layer 이름을 매칭

현재 Load JSON은 flat key-value JSON을 기준으로 합니다.

### Project Bank 변환

Project Bank 기능은 아직 예정 단계입니다.

향후에는 `project-bank.json`을 불러온 뒤 프로젝트를 선택하면, 선택된 프로젝트 목록을 flat key-value JSON으로 변환한 뒤 Figma에 적용합니다.

```txt
project-bank.json
→ selectedProjects
→ flatContentMap
→ Apply to Figma
```

## MVP에서 지원하는 것

| 기능                          | 지원     |
| --------------------------- | ------ |
| JSON 붙여넣기                   | ✅      |
| 로컬 JSON 파일 불러오기             | ✅      |
| Text Layer 이름 기준 매칭 (Apply) | ✅      |
| Text Layer 텍스트 기준 이름 지정     | ✅      |
| 중복 텍스트 매칭 시 스킵·리포트          | ✅      |
| 현재 페이지 전체 검색                | ✅      |
| 텍스트 자동 치환                   | ✅      |
| mixed font 대응                   | ✅ (1차) |
| 매칭 실패 key 리포트               | ✅      |
| 선택 Frame만 치환                | ❌      |
| dry-run / 미리보기               | ❌      |
| Project Content Bank        | ❌      |
| 프로젝트 선택 UI                  | ❌      |
| 외부 API·ChatGPT 연동           | ❌      |

## 주의사항

### 레이어 이름 = key

`resume.profile.headline` 레이어에는 JSON에도 `"resume.profile.headline"` key가 있어야 합니다.

### 텍스트 스타일

`node.characters = "..."`는 레이어 전체 문자열을 교체합니다. 한 레이어 안에 여러 스타일(굵게 등)이 섞여 있으면 스타일이 단순화될 수 있습니다.

템플릿은 가능하면 **한 레이어 = 한 역할 = 한 스타일**을 권장합니다.

다만 현재 이력서 템플릿에서는 아래처럼 하나의 Text Layer 안에 제목과 본문이 함께 들어가는 영역이 있을 수 있습니다.

```txt
resume.experience.company.01.project.01.text
cover.section.01.text
```

이 경우 JSON도 하나의 `text` key로 관리합니다. 추후 필요하면 첫 줄만 제목 스타일을 재적용하는 rich text 처리를 검토합니다.

### 같은 이름의 레이어가 여러 개

현재는 **현재 페이지 전체**를 검색합니다. 같은 이름의 Text Layer가 여러 카드에 있으면 **모두** 같은 값으로 바뀝니다. 다음 개선으로 “선택한 Frame 내부만 치환”을 고려할 수 있습니다.

### 같은 텍스트를 가진 레이어가 여러 개 (이름 지정)

**텍스트로 이름 지정** 시, JSON value와 동일한 `characters`를 가진 Text Layer가 2개 이상이면 해당 key는 변경하지 않고 결과에 스킵 사유를 표시합니다.
placeholder를 구분 가능한 고유 텍스트로 두거나, 중복이 없을 때만 이름 지정을 실행하세요.

### Auto Layout·overflow

긴 문단을 넣으면 카드 높이·줄바꿈·overflow를 Figma에서 직접 확인하세요. Text Layer는 Auto Layout 안에서 width를 `Fill container` 등으로 잡아 두는 것이 안전합니다.

### 고정 텍스트와 변경 텍스트를 섞지 않기

자동 주입 대상과 고정 텍스트가 하나의 Text Layer 안에 섞이면 유지보수가 어려워질 수 있습니다.

예를 들어 연락처 영역이 아래처럼 하나의 Text Layer로 되어 있다면:

```txt
Email ydjm1994@gmail.com
```

자동화가 필요한 값만 관리하려면 아래처럼 분리하는 편이 안전합니다.

```txt
Email
resume.profile.contact.email.value
```

단, 연락처처럼 거의 변경되지 않는 영역은 전체를 Figma 고정 텍스트로 둬도 됩니다.

## 로드맵 (예정)

1. 선택한 Frame 내부에서만 치환
2. dry-run(미리보기)
3. JSON key 자동 추출 / 레이어 이름 export
4. portfolio / resume / case-study 프리셋
5. Project Content Bank 불러오기
6. 프로젝트 목록 표시 및 선택 UI
7. 선택한 프로젝트를 companyId 기준으로 그룹핑
8. resume/career flat JSON 자동 생성
9. 프로젝트 drag & drop 정렬
10. company 순서 수동 변경
11. 프로젝트 검색 및 tag 필터
12. Bank JSON 편집 UI
13. 선택한 프로젝트 조합을 별도 preset으로 저장
14. Figma clientStorage에 최근 불러온 Bank 캐싱
15. 빈 프로젝트 슬롯 자동 숨김
16. 템플릿 프레임 복제/삭제
17. 하나의 Text Layer 내부 첫 줄/본문 스타일 재적용

## TODO

### Rich text 처리

`resume.experience.*.project.*.text`처럼 하나의 Text Layer 안에서 제목과 본문 스타일이 섞인 영역은, 현재 MVP에서는 전체 문자열을 교체합니다.

추후 플러그인에서 첫 줄 또는 첫 문단에만 title style을 적용하는 rich text 처리를 검토합니다.

### Project Content Bank

`project-bank.json`을 불러와 프로젝트 단위 문장 조각을 선택하고, 선택 결과를 Figma 주입용 flat JSON으로 변환하는 기능을 구현합니다.

### 선택 Frame 적용

현재는 `figma.currentPage` 전체를 검색합니다. 같은 key를 가진 Text Layer가 여러 영역에 있을 수 있으므로, 선택한 Frame 내부에서만 치환하는 기능을 추가합니다.

### 배열 기반 key 펼치기

`resume.skills`처럼 동일한 단일 텍스트 항목이 반복되는 영역은 배열을 받아 `resume.skills.01`, `resume.skills.02` 형태로 펼치는 기능을 검토합니다.

단, `resume.tools.*.value`는 배열로 분해하지 않습니다. Tool value는 Figma에서 하나의 Text Layer로 유지하며, 줄바꿈이 포함된 문자열 그대로 주입합니다.

## 참고 문서

* [Figma Plugin API – Working with Text](https://developers.figma.com/docs/plugins/working-with-text/)
* [Plugin Quickstart Guide](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/)
* [@figma/plugin-typings](https://github.com/figma/plugin-typings)
