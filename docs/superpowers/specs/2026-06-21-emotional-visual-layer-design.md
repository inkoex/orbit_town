# 설계: A — 감성·시각 레이어 (최소 v1)

**날짜:** 2026-06-21
**상태:** 설계 합의 완료 · Codex 리뷰 6건 반영 완료 · 검토 대기
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
- **뷰 = 평면(top-down) 우주테마로 시작**. 아이소메트릭(Orbit 2.5D 룩)은 후속 작업.
  - ⚠️ **수정(Codex 리뷰 #4)**: "world→screen 함수 하나로 iso-ready"는 **오판**이었다. 실제 좌표 계산은 여러 곳에 분산돼 있고(정변환 `Player.tsx`, 클릭 역변환 `PixiGame.tsx`, 맵 렌더 `PixiStaticMap.tsx`), iso 전환엔 역변환·클릭 이동·맵 렌더·viewport·depth sorting이 함께 바뀐다. 따라서 **v1에서는 iso 대비 추상화를 넣지 않는다**(YAGNI). 실제 iso 작업 시 `project / unproject + depthKey` 인터페이스로 제대로 설계한다.

---

## 4. 범위

### 포함 (IN)
1. **우주 배경 리스킨**: 검은 우주 + 별 배경 + 정거장풍 타일.
   - ⚠️ **수정(Codex 리뷰 #3)**: `PixiStaticMap.tsx`는 타일셋 atlas를 **인덱스**로 참조하고(`tiles[tileIndex]`) 맵 데이터(`bgTiles`/`objectTiles`)는 인덱스만 저장한다. **타일셋 PNG만 교체하면 같은 인덱스가 다른 그림을 가리켜 맵이 깨진다.** 따라서 전략을 명시한다:
   - **채택 전략(v1)**: **기존 타일셋 atlas 배치(인덱스)를 유지한 채 각 타일을 우주 톤으로 리페인트**. 맵 데이터·인덱스 무변경, 그림만 교체 → 최소 위험. (대안: 호환 우주 타일셋 제작, 또는 인덱스 매핑 테이블 — 더 큰 작업이라 v1 제외.)
   - **에셋 거버넌스**: 출처·라이선스(상업적 사용 가능, CC0 등)·attribution을 `data/assets/CREDITS.md`(신규)에 기록.
2. **우주 테마 프리메이드 아바타 6~8종**: 무료/상업적 사용 가능 32x32 스프라이트를 새 spritesheet로 추가, `data/characters.ts`의 `characters` 배열에 등록. (라이선스·attribution은 위 CREDITS.md에 함께 기록.)
3. **최소 커스텀 에이전트 생성 UI** (`AgentCreator.tsx`): 아바타 비주얼 피커(그리드) + 이름 + identity(성격) + plan 입력. 기존 `createAgent` 인풋을 확장해 `{name, identity, plan, character}`를 받게 함.
4. **영속성 (스키마 변경 없음)**:
   - ⚠️ **수정(Codex 리뷰 #5)**: 데이터 모델 확장 **불필요**. 필요한 필드가 이미 존재한다 — `playerDescriptions`{name, description, character}, `agentDescriptions`{identity, plan}. createAgent가 UI 입력을 이 **기존 필드에 매핑**(name·character→playerDescription, identity·plan→agentDescription)할 뿐, 새 테이블·스키마 변경 없음.
5. **PlayerDetails**: 클릭 시 커스텀 정보 표시.
6. **서버측 생성 가드 (보안)**:
   - ⚠️ **추가(Codex 리뷰 #2)**: `sendWorldInput`은 인증이 꺼져 있고 `args: v.any()`로 임의 입력을 받는다. 공개 시 무제한 에이전트 생성으로 비용·월드 상태 소진 위험. v1에서 인증은 제외하되 **createAgent 핸들러에 서버측 제한**을 둔다: ①월드당 최대 에이전트 수 ②name/identity/plan 길이 검증 ③허용된 character ID 화이트리스트 ④중복 이름 정책 ⑤생성 중복/연타 요청 방지(idempotency).

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

좌표 변환은 v1에서 기존 코드 구조 그대로 둔다(§3 참고 — iso 대비 추상화는 넣지 않음).

---

## 6. 개발 셋업 (조합 1: 클라우드 무료 + OpenRouter)

LLM 호출은 Convex action 안(=백엔드)에서 일어난다. 백엔드가 클라우드이므로 로컬 Ollama(localhost)는 닿지 않는다. 따라서 클라우드 LLM을 쓴다.

- **Convex**: 무료 클라우드 dev 배포. **실행은 `npm run dev` 하나면 충분** — 내부적으로 `dev:backend`(convex dev)와 `dev:frontend`(vite)를 병렬 실행하고, `predev`가 `init`까지 돌린다. 별도 `npx convex dev` 불필요(⚠️ 수정 Codex 리뷰 #6).
- **LLM = OpenRouter 단일 키** (⚠️ 수정 Codex 리뷰 #1):
  - OpenRouter는 채팅뿐 아니라 **임베딩 API도 제공**한다(`https://openrouter.ai/api/v1/embeddings`, 검증 완료). 따라서 **OpenAI 키 별도 추가 불필요** — OpenRouter 키 하나로 채팅+임베딩 모두 처리.
  - `convex/util/llm.ts`의 **custom provider**가 이미 `LLM_API_URL` + `LLM_MODEL`(채팅) + `LLM_EMBEDDING_MODEL`(임베딩)을 각각 지정 가능. → `LLM_API_URL=https://openrouter.ai/api/v1` 로 설정.
  - 채팅은 테스트용 무료 모델(`...:free`) 사용 가능(레이트리밋 있음).
- ⚙️ **`convex/util/llm.ts` 수정 필요(작음)**: 임베딩 **차원으로 공급자를 추측**하는 검증 로직(`EMBEDDING_DIMENSION` switch)을 선택한 OpenRouter 임베딩 모델의 차원에 맞게 조정. `EMBEDDING_DIMENSION`을 그 모델 출력 차원으로 설정.

---

## 7. 에러 처리 / 보안

- **서버측 createAgent 가드**(§4-6 참고, 보안 필수): 월드당 최대 에이전트 수, name/identity/plan 정확한 길이, 허용 character ID 화이트리스트, 중복 이름 정책, 생성 연타/중복 idempotency.
- 클라이언트 입력 검증(UX용): 이름 필수, 아바타 미선택 시 기본값. **단 서버측 검증이 신뢰 경계** — 클라 검증에 의존하지 않음.
- OpenRouter 무료 모델 레이트리밋/실패 시 graceful 처리(기존 llm.ts 재시도 패턴 활용).
- 임베딩 차원 불일치 방지(설정 검증).

---

## 8. 검증 (테스트 계획)

1. **셋업**: `npm run dev` 하나로 실행(백엔드+프론트+init 포함). OpenRouter 키만 설정. 기존 town 정상 동작 확인.
2. **테마**: 페이지 로드 → 검은 우주 배경 + 정거장풍(리페인트) 타일이 **맵 깨짐 없이** 보임. 에이전트가 우주 스프라이트로 보임. (실제 화면 캡처로 확인.)
3. **커스텀 생성**: UI로 아바타 선택 + 이름·성격·plan 입력 → 에이전트가 월드에 등장, 이동, 성격대로 대화.
4. **영속성**(⚠️ 수정 Codex 리뷰 #6): 커스텀 에이전트가 **①페이지 새로고침 ②엔진 재시작 ③재배포** 후에도 유지됨. (wipe로 유지되는 게 아님.)
5. **PlayerDetails**: 클릭 시 커스텀 정보 표시.
6. **생성 가드**: 길이 초과/비허용 character/중복 이름/최대치 초과/연타 요청이 서버에서 거부됨.
7. **무손상**: 기존 시뮬레이션(원본 캐릭터 포함) 정상 동작. 에이전트 5~8명 규모로 5~10분 관찰.
8. **wipe 초기화 검증**(영속성과 분리): `npx convex run testing:wipeAllTables` 후 `init`으로 **기본 에이전트로 정상 재초기화**되는지 확인.

---

## 9. 제가(엔지니어) 정한 기본값

- 맵: 새 설계 없이 기존 레이아웃 유지 + **기존 atlas 인덱스 보존 리페인트**(타일셋 단순 교체 아님).
- 저장: **기존 `playerDescriptions`/`agentDescriptions` 필드 재사용, 스키마 변경 없음**.
- 생성 UI: 우측 패널 "에이전트 만들기" 버튼 → 모달.
- 테스트 에이전트 수: 5~8명(월드당 최대치도 이 수준으로 가드).
- 좌표 변환: v1에 iso 대비 추상화 없음.
- 프로젝트명: 지금은 유지(브랜딩은 후속).
