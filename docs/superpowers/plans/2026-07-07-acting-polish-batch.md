# 연기 폴리시 배치 (5종) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. 스펙: `docs/superpowers/specs/2026-07-07-acting-polish-batch-design.md`

**Goal:** ②a 연기의 시각 품질 5종 — 앰버 대기 글로우 / 말풍선 하강 / 40자 / 걷고-서고 서성임 / 엔진 우선 규칙.

**Tech:** 기존 파일 4곳 수정 (acting.ts, Player.tsx, IsoCharacter.tsx, SpeechBubble.tsx). 새 의존성·서버 변경·새 에셋 0.

## Global Constraints

- `acting.ts`는 Vite-free 순수 유지. 절대시간 결정론 유지 (프레임 적분 금지).
- tsc·jest 전체·vite build 그린 유지.
- 스펙의 상수 그대로: 앰버 0xffb454/0xffd28a, Pulse 2600ms, 말풍선 -198/-212, truncate 40, 서성임 WALK 1800ms/DWELL 3200ms/진폭 0.5타일.

---

### Task 1: `pacingPose` v2 — 걷고-서고 리듬 (TDD)

**Files:** Modify `src/components/isometric/acting.ts`, `src/components/isometric/acting.test.ts`

- [ ] Step 1: 기존 pacingPose 테스트 3개(±1타일·speed 양수·반주기 반전)를 v2 명세로 교체 — 결정론 / |offset|≤0.5 / 10초 주기 500ms 샘플링에서 speed 0 비율 ≥ 60% / 걷기 구간 facing.dx = 이동 방향 / 이름별 위상차.
- [ ] Step 2: RED 확인 (`npm test -- acting`).
- [ ] Step 3: 구현 — 주기 10000ms 4구간 piecewise: [0,1800) +x 걷기(offset 0→0.5, facing +1, speed 1) / [1800,5000) 서기(offset 0.5, facing +1, speed 0) / [5000,6800) -x 걷기(0.5→0, facing -1, speed 1) / [6800,10000) 서기(0, facing -1, speed 0). 위상 = nameHash % 10000.
- [ ] Step 4: GREEN + tsc.
- [ ] Step 5: Commit `feat(iso): 서성임 v2 — 걷고-서고 리듬 (부산스러움 완화)`.

### Task 2: ①②③⑤ 렌더 수정 일괄

**Files:** Modify `src/components/isometric/IsoCharacter.tsx`, `src/components/isometric/SpeechBubble.tsx`, `src/components/Player.tsx`

- [ ] Step 1 (①): IsoCharacter — `awaiting?: boolean` prop. drawActiveGlow에서 awaiting이면 fill을 0xffb454(0.28)/0xffd28a(0.22)로, Pulse periodMs를 `awaiting ? 2600 : 1900`.
- [ ] Step 2 (②): SpeechBubble — `TAIL_TIP_Y = -198`, `PANEL_BOTTOM_Y = -212` (주석의 좌표 설명도 갱신).
- [ ] Step 3 (③⑤): Player —
  - truncate 24 → 40 (연기 말풍선만).
  - 엔진 우선: `const engineMoving = historicalLocation.speed > 0;`
    `const pose = direction?.kind === 'working' && name && !engineMoving ? pacingPose(name, actingNow) : undefined;`
    `const renderSpeed = pose ? pose.speed : direction && !engineMoving ? 0 : historicalLocation.speed;`
    (renderPosition/renderFacing은 pose 없으면 이미 historicalLocation 사용 — 그대로.)
  - IsoCharacter에 `awaiting={direction?.kind === 'awaiting_approval'}` 전달.
  - simulationTime: 엔진 이동 중엔 기존 `historicalTime ?? Date.now()` 우선 (`direction && !engineMoving ? actingNow : (historicalTime ?? Date.now())`).
- [ ] Step 4: `npx tsc --noEmit` + `npm test -- --silent` + `npx vite build` 그린.
- [ ] Step 5: Commit `feat(iso): 연기 폴리시 — 앰버 대기·말풍선 하강·40자·엔진 우선`.

### Task 3: 시각 검증 + 문서

- [ ] Step 1: Frozen 확인 → 재생기 `--once` → Playwright: working 서성임(두 샷 중 한 샷은 서 있기), ⏸ 앰버 글로우 + 40자 말풍선 + 머리 위 근접.
- [ ] Step 2: (울트라코드) 변경 diff 적대적 리뷰 워크플로우 — correctness/결정론/회귀 렌즈.
- [ ] Step 3: PROJECT_STATUS 갱신 + 커밋 + push.
