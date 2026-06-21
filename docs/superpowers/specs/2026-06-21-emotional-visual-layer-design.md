# 설계: A — 감성·시각 레이어 (최소 v1)

**날짜:** 2026-06-21
**상태:** 설계 합의 완료, 검토 대기
**하위 조각:** A (전체 플랫폼 비전의 첫 번째 조각)

---

## 1. 배경 / 비전

이 프로젝트의 최종 목표는 **여러 사용자를 위한 멀티 에이전트 플랫폼**이다 (Google Antigravity Orbit 영감). 사용자가 자신의 용도를 설명하면 AI가 팀 구성을 제안하고, 역할별로 다양한 모델을 연결하며, 에이전트들이 실제 작업을 수행한다.

핵심 **차별점**은 **감성·시각 레이어**다: 기존 멀티에이전트 도구(Hermes, OpenClaude 등)에 빠져 있는 감성적 측면 — *내가 만든/고른 에이전트가 어떤 외형과 성격을 갖고, 공간 속에서 살아 움직이며 일하는 걸 눈으로 보는* 경험. 이것이 시스템의 유일한 차별 요소다.

이 문서는 그 비전의 **첫 번째 하위 조각(A)** 만 다룬다.

### 전체 플랫폼 분해 (참고)

| # | 조각 | 상태 |
|---|---|---|
| **A** | 감성·시각 레이어 | **이 문서** |
| B | 온보딩 대화 → AI 팀 구성 제안 | 후속 |
| C | 모델 라우팅 (OpenRouter / BYO 키) | 후속 |
| D | 실제 작업 실행 (리서치·코드·글쓰기 tool) | 후속 |
| E | 멀티테넌시 / 인증 | 후속 |

각 조각은 각자 스펙 → 계획 → 구현 사이클을 따로 돈다.

---

## 2. A v1 목표 (감성 모먼트)

기존 단일 AI Town 인스턴스 위에서 다음을 증명한다:

> **우주 분위기 속에서, 내가 고른 아바타에 이름·성격을 붙인 에이전트가 돌아다니며 사는(이동·대화) 걸 본다.**

"실제 업무 수행"은 이 조각에 포함하지 않는다 (그건 D).

---

## 3. 아키텍처 결정

- **AI Town 확장** (엔진 재작성 안 함). 검증된 시뮬레이션 루프·메모리·대화·렌더링을 그대로 재사용.
- **작업 격리**: `feature/emotional-visual-layer` 브랜치에서 작업. 원본 에셋(`data/gentle.js`, 기존 folk 캐릭터)은 **삭제하지 않고 우주 에셋을 옆에 추가**한 뒤 활성 설정만 전환.
- **백엔드 = Convex 유지**. 개발은 무료 클라우드 티어 사용. 상용화 시 셀프호스팅(Docker) 또는 매니지드 중 배포 단계에서 결정 — 코드 변경 없음, 락인 우려 없음(셀프호스팅 항상 가능).
- **뷰 = 평면(top-down) 우주테마로 시작**. 아이소메트릭(Orbit 2.5D 룩)은 후속 격리 업그레이드. 이를 싸게 만들기 위해 **world→screen 좌표 변환을 단일 모듈로 격리(iso-ready)**: 평면은 `(x,y)→(x,y)`, iso 전환 시 해당 함수만 교체.

---

## 4. 범위

### 포함 (IN)
1. **우주 배경 리스킨**: 검은 우주 + 별 배경, 기존 맵 타일을 "정거장 플랫폼" 느낌으로 교체. 기존 맵 레이아웃은 유지(새 맵 설계 안 함). `PixiStaticMap`/`PixiGame` 배경 톤 조정.
2. **우주 테마 프리메이드 아바타 6~8종**: 무료/상업적 사용 가능 32x32 스프라이트를 새 spritesheet로 추가, `data/characters.ts`의 `characters` 배열에 등록.
3. **최소 커스텀 에이전트 생성 UI** (`AgentCreator.tsx`): 아바타 비주얼 피커(그리드) + 이름 + identity(성격) + plan 입력. 기존 `createAgent` 인풋을 확장해 `descriptionIndex`만이 아니라 `{name, identity, plan, character}` 전체를 받게 함.
4. **영속성**: 커스텀 에이전트 설명을 `playerDescription`/`agentDescription` 확장으로 저장(별도 테이블 없음).
5. **PlayerDetails**: 클릭 시 커스텀 정보 표시.

### 제외 (후속 조각)
- 온보딩 대화 → AI 팀 구성 (B)
- 모델 라우팅 / OpenRouter 다중 모델 / BYO (C) — *단, 개발용 단일 LLM 셋업은 아래 6장 참고*
- 실제 작업 모듈 + tool 실행 (D)
- 멀티테넌시 / 인증 (E)
- 아이소메트릭 렌더링
- 레이어드 입혀보기(옷·헤어), AI 생성 아바타

---

## 5. 컴포넌트 / 데이터 흐름

```
[브라우저: React + PixiJS]
  - PixiStaticMap/PixiGame: 우주 배경·타일 렌더
  - AgentCreator.tsx (우측 패널 버튼 → 모달): 아바타 피커 + 이름/성격/plan
  - PlayerDetails.tsx: 커스텀 정보 표시
        │  useSendInput('createAgent', {name, identity, plan, character})
        ▼
[Convex 백엔드 (무료 클라우드)]
  - agentInputs.ts: createAgent 확장 → Player + agent/playerDescription 생성
  - 기존 엔진 틱 루프 / 메모리 / 대화 그대로
        │  reactive useQuery
        ▼
[화면: 에이전트 등장 → 이동·대화 (성격 반영) → 실시간 렌더]
```

**좌표 추상화 모듈**: 렌더링 시 world(x,y) → screen 변환을 한 곳에 모은다. v1은 identity 변환, iso 전환 시 이 모듈만 교체.

---

## 6. 개발 셋업 (조합 1: 클라우드 무료 + OpenRouter)

LLM 호출은 Convex action 안(=백엔드)에서 일어난다. 백엔드가 클라우드이므로 로컬 Ollama(localhost)는 닿지 않는다. 따라서:

- **Convex**: 무료 클라우드 dev 배포 (`npx convex dev`).
- **대화(chat) LLM**: **OpenRouter**. 테스트는 무료 모델(`...:free`) 사용. 무료 계정 + API 키 필요, 레이트리밋 있음.
- **임베딩(memory)**: OpenRouter는 임베딩 미제공 → **OpenAI `text-embedding-3-small`** 사용(비용 거의 0). OpenAI 키 추가 필요.
- ⚙️ **`convex/util/llm.ts` 수정 필요**: chat provider와 embedding provider를 **분리 지정**할 수 있게 함 (현재는 단일 provider 선택). `EMBEDDING_DIMENSION`을 OpenAI(1536)에 맞춤.

---

## 7. 에러 처리

- 입력 검증: 이름 필수·길이 제한, 아바타 미선택 시 기본값, 중복 이름 처리.
- OpenRouter 무료 모델 레이트리밋/실패 시 graceful 처리(기존 llm.ts 재시도 패턴 활용).
- 임베딩 차원 불일치 방지(설정 검증).

---

## 8. 검증 (테스트 계획)

1. **셋업**: `npm run dev` + `npx convex dev`. OpenRouter/OpenAI 키 설정. 기존 town 정상 동작 확인.
2. **테마**: 페이지 로드 → 검은 우주 배경 + 정거장풍 타일 보임. 에이전트가 우주 스프라이트로 보임.
3. **커스텀 생성**: UI로 아바타 선택 + 이름·성격·plan 입력 → 에이전트가 월드에 등장, 이동, 성격대로 대화.
4. **영속성**: 리셋/재기동 후에도 커스텀 에이전트 유지.
5. **PlayerDetails**: 클릭 시 커스텀 정보 표시.
6. **무손상**: 기존 시뮬레이션(원본 캐릭터 포함) 정상 동작. 에이전트 5~8명 규모로 5~10분 관찰.
7. **리셋 안전**: `npx convex run testing:wipeAllTables && npx convex run init`.

---

## 9. 제가(엔지니어) 정한 기본값

- 맵: 새 설계 없이 기존 레이아웃 + 타일 교체.
- 저장: `playerDescription`/`agentDescription` 확장 (별도 테이블 X).
- 생성 UI: 우측 패널 "에이전트 만들기" 버튼 → 모달.
- 테스트 에이전트 수: 5~8명.
- 프로젝트명: 지금은 유지(브랜딩은 후속).
