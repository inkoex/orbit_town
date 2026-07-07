# 아바타 최소 연기 (슬라이스 ②a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** workEvents를 아바타 몸짓(하이라이트 + ⚙/⏸ 말풍선 + 제자리 서성임)으로 번역한다 — 클라이언트 전용, Frozen 유지.

**Architecture:** 순수 안무가(`acting.ts`: 이벤트→무대지시, 절대시간 서성임 포즈) + PixiGame에서 지시 Map 계산 + Player iso 분기에서 렌더 직전 오버라이드. 서버/Convex 변경 0.

**Tech Stack:** React + @pixi/react(useTick), 기존 IsoCharacter/SpeechBubble/activeState 재사용, jest(ts-jest ESM).

**Spec:** `docs/superpowers/specs/2026-07-07-avatar-acting-design.md`

## Global Constraints

- 서버·Convex 함수·스키마 수정 금지. 새 npm 의존성 금지. 새 이미지 에셋 금지.
- `acting.ts`는 **Vite-free 순수 모듈** (import.meta·config/debug import 금지 — `activeState.ts` 파일 상단 주석과 동일한 이유, jest가 직접 import).
- 절대시간 결정론: 포즈는 `(name, now)`만의 함수. 프레임 적분(누적 상태) 금지.
- tsconfig가 `**/*.ts`를 include — 새 파일은 `npx tsc --noEmit` 통과 필수.
- 티커는 계속 최신 4건만 표시 (구독 count를 20으로 올리되 티커 쪽은 slice).
- 이벤트 어휘·M002 대본 문구는 기존 것 그대로 사용 (수정 금지).

---

### Task 1: 안무가 순수 로직 `acting.ts`

**Files:**
- Create: `src/components/isometric/acting.ts`
- Test: `src/components/isometric/acting.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 모듈). 테스트만 `scripts/workevents/m002.json`을 fs로 읽음.
- Produces (Task 2가 사용):
  - `type StageDirection = { kind: 'working' | 'awaiting_approval'; summary: string; since: number }`
  - `type WorkEventLike = { sequence: number; type: string; summary: string; agentName?: string; externalRunId?: string; sourceTimestamp?: number; _creationTime?: number }`
  - `deriveStageDirections(events: WorkEventLike[], now: number): Map<string, StageDirection>` — 키는 **소문자 이름**
  - `pacingPose(name: string, now: number): { offsetX: number; facing: { dx: number; dy: number }; speed: number }`
  - `ACTING_TTL_MS = 90_000`

- [ ] **Step 1: Write the failing test**

`src/components/isometric/acting.test.ts` 생성:

```ts
import { readFileSync } from 'node:fs';
import {
  ACTING_TTL_MS,
  deriveStageDirections,
  pacingPose,
  WorkEventLike,
} from './acting';

// M002 대본을 "재생된 이벤트 배열"로 변환 — 재생기의 envelope 채우기와 동일 규칙.
type ScriptEntry = { delay: number; agentName?: string; type: string; summary: string };
const doc = JSON.parse(readFileSync('scripts/workevents/m002.json', 'utf8')) as {
  runPrefix: string;
  script: ScriptEntry[];
};

// t0 기준으로 delay를 누적해 sourceTimestamp를 만든다.
function replayedEvents(t0: number, upTo?: number): WorkEventLike[] {
  let t = t0;
  const out: WorkEventLike[] = [];
  doc.script.forEach((e, i) => {
    t += e.delay * 1000;
    if (upTo !== undefined && i + 1 > upTo) return;
    out.push({
      sequence: i + 1,
      type: e.type,
      summary: e.summary,
      ...(e.agentName !== undefined ? { agentName: e.agentName } : {}),
      externalRunId: `${doc.runPrefix}-r1`,
      sourceTimestamp: t,
    });
  });
  return out;
}

describe('deriveStageDirections — M002 대본 기준', () => {
  const T0 = 1_000_000;

  test('9번(Vega 렌더 완료)까지: Atlas·Nova·Vega 전원 working', () => {
    const events = replayedEvents(T0, 9);
    const now = events[events.length - 1].sourceTimestamp! + 1000;
    const d = deriveStageDirections(events, now);
    expect(d.get('atlas')?.kind).toBe('working');
    expect(d.get('nova')?.kind).toBe('working');
    expect(d.get('vega')?.kind).toBe('working');
    expect(d.get('vega')?.summary).toContain('orbit-launch.mp4');
  });

  test('10번(decision_recorded, SYS) 후: 직전 연기자 Vega가 awaiting_approval', () => {
    const events = replayedEvents(T0, 10);
    const now = events[events.length - 1].sourceTimestamp! + 1000;
    const d = deriveStageDirections(events, now);
    expect(d.get('vega')?.kind).toBe('awaiting_approval');
    expect(d.get('vega')?.summary).toContain('승인 대기');
    // 다른 아바타는 영향 없음
    expect(d.get('nova')?.kind).toBe('working');
  });

  test('12번(run_finished) 후: Atlas 해제, Vega는 최신이 11번이라 working 유지', () => {
    const events = replayedEvents(T0, 12);
    const now = events[events.length - 1].sourceTimestamp! + 1000;
    const d = deriveStageDirections(events, now);
    expect(d.has('atlas')).toBe(false);
    expect(d.get('vega')?.kind).toBe('working'); // 11번 status_changed
  });

  test('TTL 90초 경과: 전원 해제', () => {
    const events = replayedEvents(T0, 12);
    const now = events[events.length - 1].sourceTimestamp! + ACTING_TTL_MS + 1;
    const d = deriveStageDirections(events, now);
    expect(d.size).toBe(0);
  });

  test('이벤트 없음 → 빈 맵', () => {
    expect(deriveStageDirections([], T0).size).toBe(0);
  });
});

describe('pacingPose — 절대시간 결정론', () => {
  test('같은 (name, now)는 항상 같은 포즈', () => {
    expect(pacingPose('Vega', 123_456)).toEqual(pacingPose('Vega', 123_456));
  });

  test('오프셋은 ±1타일 안에서 왕복하고 speed는 양수', () => {
    for (let t = 0; t <= 12_000; t += 500) {
      const p = pacingPose('Vega', t);
      expect(Math.abs(p.offsetX)).toBeLessThanOrEqual(1);
      expect(p.speed).toBeGreaterThan(0);
      expect([1, -1]).toContain(p.facing.dx);
      expect(p.facing.dy).toBe(0);
    }
  });

  test('반주기(3초) 간격으로 진행 방향이 반전된다', () => {
    // 어떤 시점 t와 t+3000의 facing.dx는 반대
    const a = pacingPose('Vega', 0);
    const b = pacingPose('Vega', 3000);
    expect(a.facing.dx).toBe(-b.facing.dx);
  });

  test('이름이 다르면 위상이 달라 같은 시각에 같은 걸음이 아니다', () => {
    const names = ['Vega', 'Nova', 'Atlas', 'Orion', 'Iris'];
    const poses = names.map((n) => pacingPose(n, 50_000).offsetX);
    expect(new Set(poses.map((v) => v.toFixed(3))).size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- acting`
Expected: FAIL — `Cannot find module './acting'`.

- [ ] **Step 3: Write minimal implementation**

`src/components/isometric/acting.ts` 생성:

```ts
// Pure, Vite-free (Jest-safe) — activeState.ts와 같은 규칙.
// 안무가: workEvents 스트림을 아바타별 "무대지시"로 번역한다 (슬라이스 ②a).
// 스펙: docs/superpowers/specs/2026-07-07-avatar-acting-design.md
// - 아바타 상태 = 그 아바타의 최신 이벤트 하나 (sequence 내림차순 첫 매치)
// - decision_recorded(SYS)는 같은 run에서 직전에 연기하던 아바타에게 귀속
// - run_finished는 즉시 해제, 그 외는 TTL 90초
// - 서성임 포즈는 (name, now)만의 함수 — 절대시간 결정론(멀티탭 동일)

export type StageDirection = {
  kind: 'working' | 'awaiting_approval';
  summary: string;
  since: number;
};

export type WorkEventLike = {
  sequence: number;
  type: string;
  summary: string;
  agentName?: string;
  externalRunId?: string;
  sourceTimestamp?: number;
  _creationTime?: number;
};

export const ACTING_TTL_MS = 90_000;

const eventTime = (e: WorkEventLike) => e.sourceTimestamp ?? e._creationTime ?? 0;

export function deriveStageDirections(
  events: WorkEventLike[],
  now: number,
): Map<string, StageDirection> {
  const sorted = [...events].sort((a, b) => b.sequence - a.sequence);
  const directions = new Map<string, StageDirection>();
  const settled = new Set<string>(); // 이미 최신 상태가 정해진 아바타 (해제 포함)

  for (const e of sorted) {
    if (e.type === 'decision_recorded' && e.agentName === undefined) {
      // 같은 run에서 이 결정보다 앞선, 이름 있는 최신 이벤트의 주인공이 대기한다.
      const target = sorted.find(
        (p) =>
          p.sequence < e.sequence &&
          p.agentName !== undefined &&
          p.externalRunId === e.externalRunId,
      )?.agentName;
      if (target === undefined) continue;
      const key = target.toLowerCase();
      if (settled.has(key)) continue;
      settled.add(key);
      if (now - eventTime(e) > ACTING_TTL_MS) continue;
      directions.set(key, { kind: 'awaiting_approval', summary: e.summary, since: eventTime(e) });
      continue;
    }
    if (e.agentName === undefined) continue;
    const key = e.agentName.toLowerCase();
    if (settled.has(key)) continue;
    settled.add(key);
    if (e.type === 'run_finished') continue; // 즉시 해제
    if (now - eventTime(e) > ACTING_TTL_MS) continue; // TTL 만료
    directions.set(key, { kind: 'working', summary: e.summary, since: eventTime(e) });
  }
  return directions;
}

// ---- 서성임(pacing) ----
// 주기 6초 삼각파로 x축 ±1타일 왕복. 위상은 이름 해시로 어긋나게(동기화 행진 방지).
const PACING_PERIOD_MS = 6000;
const PACING_AMPLITUDE_TILES = 1;

function nameHash(name: string): number {
  return Math.abs([...name].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
}

export function pacingPose(
  name: string,
  now: number,
): { offsetX: number; facing: { dx: number; dy: number }; speed: number } {
  const phase = nameHash(name) % PACING_PERIOD_MS;
  const t = ((now + phase) % PACING_PERIOD_MS) / PACING_PERIOD_MS; // 0..1
  // 삼각파: 0→1(전반) / 1→0(후반). 전반은 +x로 걷는 중.
  const forward = t < 0.5;
  const tri = forward ? t * 2 : 2 - t * 2; // 0..1..0
  const offsetX = (tri * 2 - 1) * PACING_AMPLITUDE_TILES; // -1..+1
  return {
    offsetX,
    facing: { dx: forward ? 1 : -1, dy: 0 },
    speed: 1,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- acting`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/isometric/acting.ts src/components/isometric/acting.test.ts
git commit -m "feat(iso): 안무가 순수 로직 — workEvents→무대지시 + 결정론 서성임 포즈"
```

---

### Task 2: PixiGame·Player 배선 (연기 오버라이드)

**Files:**
- Modify: `src/components/PixiGame.tsx` (구독 count, 지시 Map 계산, iso Player에 prop 전달)
- Modify: `src/components/Player.tsx` (iso 분기 오버라이드 + `useActingNow` 훅)

**Interfaces:**
- Consumes: Task 1의 `deriveStageDirections`/`pacingPose`/`StageDirection`, 기존 `useQuery(api.workEvents.list)`, `SpeechBubble`, `truncateBubbleText`, `IsoCharacter`.
- Produces: `Player`의 새 optional prop `stageDirections?: Map<string, StageDirection>`.

- [ ] **Step 1: PixiGame 수정** — workEvents 구독 부분(줄 74~84 근처)을 다음으로 교체:

기존:
```tsx
  const workEvents = useQuery(api.workEvents.list, isoMode ? { count: 4 } : 'skip');
  const workTicker = useMemo(
    () =>
      (workEvents ?? []).map(
        (e) => `◢ ${(e.agentName ?? 'SYS').toUpperCase()} · ${e.summary}`,
      ),
    [workEvents],
  );
```

교체:
```tsx
  // count 20: 티커(최신 4)와 아바타 연기(에이전트별 최신 이벤트 탐색)가 공유.
  const workEvents = useQuery(api.workEvents.list, isoMode ? { count: 20 } : 'skip');
  const workTicker = useMemo(
    () =>
      (workEvents ?? [])
        .slice(0, 4)
        .map((e) => `◢ ${(e.agentName ?? 'SYS').toUpperCase()} · ${e.summary}`),
    [workEvents],
  );
  // 무대지시는 이벤트 변화(reactive) + 10초 조각시계(TTL/run_finished 만료용)로 재계산.
  const [actingEpoch, setActingEpoch] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActingEpoch((e) => e + 1), 10_000);
    return () => clearInterval(id);
  }, []);
  const stageDirections = useMemo(
    () => deriveStageDirections(workEvents ?? [], Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actingEpoch = 시간 경과 트리거
    [workEvents, actingEpoch],
  );
```

import 추가 (파일 상단): `import { deriveStageDirections } from './isometric/acting';` — `useState`/`useEffect`가 이미 import돼 있는지 확인하고 없으면 react import에 추가.

iso 분기의 `<Player …>` (줄 298 근처, `isoProjection` 넘기는 그 블록)에 prop 추가:
```tsx
                stageDirections={stageDirections}
```
(2D/디버그 분기의 Player는 그대로 — 연기는 iso 전용.)

- [ ] **Step 2: Player 수정** — (a) import와 훅 추가, (b) props 확장, (c) iso 분기 오버라이드.

(a) 상단 import 추가:
```tsx
import { useRef, useState } from 'react';
import { useTick } from '@pixi/react';
import { pacingPose, StageDirection } from './isometric/acting';
```

(a-2) 파일 하단(컴포넌트 밖)에 훅 추가:
```tsx
// 연기 중일 때만 ~10fps로 리렌더를 유발하는 시계. Frozen 월드에선 서버발
// 리렌더가 없어서, 이 시계가 없으면 서성임이 정지 사진이 된다.
function useActingNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  const last = useRef(0);
  useTick(() => {
    if (!active) return;
    const t = Date.now();
    if (t - last.current > 100) {
      last.current = t;
      setNow(t);
    }
  });
  return now;
}
```

(b) Player props에 추가 (기존 `worldId?: …` 다음):
```tsx
  // 슬라이스 ②a: 이름(소문자) → 무대지시. 있으면 렌더 직전 오버라이드.
  stageDirections?: Map<string, StageDirection>;
```
함수 인자 구조분해에도 `stageDirections,` 추가.

(c) **컴포넌트 최상단**(React 훅 규칙 — 조건 분기 밖), `useHistoricalValue` 호출 바로 다음에 추가:
```tsx
  const name = game.playerDescriptions.get(player.id)?.name;
  const direction = name ? stageDirections?.get(name.toLowerCase()) : undefined;
  const actingNow = useActingNow(direction?.kind === 'working');
```
그리고 iso 분기 안의 기존 `const name = game.playerDescriptions.get(player.id)?.name;` 줄은 **삭제** (최상단 것을 사용). 주의: 이 세 줄은 `if (!character)`/`if (!historicalLocation)` 같은 early return들 **앞**에 와야 한다 (훅은 모든 렌더에서 같은 순서로 호출돼야 하므로).

(d) iso 분기의 activeState 계산에 연기 반영 — 기존 계산 전체를 다음으로 교체 (인자는 현재 코드와 동일):
```tsx
    const activeState = direction
      ? 'active'
      : ISO_STATE_DEBUG
        ? debugActiveState(player.id)
        : deriveActiveState({
            isSpeaking: game.typingPlayerIds.has(player.id),
            isThinking: game.thinkingPlayerIds.has(player.id),
            isMoving: historicalLocation.speed > 0,
            hasLiveActivity: !!player.activity && player.activity.until > now,
          });
```

(e) 말풍선 우선순위 — 기존 체인(`ISO_BUBBLE_DEBUG` > typing > conversation > idle activity)에서 **conversation 다음, idle activity 앞**에 분기 추가:
```tsx
    } else if (direction) {
      bubble = (
        <SpeechBubble
          text={`${direction.kind === 'working' ? '⚙' : '⏸'} ${truncateBubbleText(direction.summary, 24)}`}
        />
      );
    } else if (!conversation && player.activity && player.activity.until > now) {
```

(f) IsoCharacter에 넘기는 위치/방향/속도/시각 오버라이드 — 기존 `<IsoCharacter …>` 직전에:
```tsx
    const pose = direction?.kind === 'working' && name ? pacingPose(name, actingNow) : undefined;
    const renderPosition = pose
      ? { x: historicalLocation.x + pose.offsetX, y: historicalLocation.y }
      : historicalLocation;
    const renderFacing = pose
      ? pose.facing
      : { dx: historicalLocation.dx, dy: historicalLocation.dy };
    const renderSpeed = pose ? pose.speed : direction ? 0 : historicalLocation.speed;
```
그리고 IsoCharacter props를 교체:
```tsx
        position={renderPosition}
        facing={renderFacing}
        speed={renderSpeed}
        simulationTime={direction ? actingNow : (historicalTime ?? Date.now())}
```

- [ ] **Step 3: 타입·테스트·빌드 확인**

Run: `npx tsc --noEmit && npm test -- --silent 2>&1 | tail -3 && npx vite build 2>&1 | tail -2`
Expected: tsc 에러 0, jest 전체 PASS(기존 168 + Task 1의 9 = 177), vite build 성공.

- [ ] **Step 4: Commit**

```bash
git add src/components/PixiGame.tsx src/components/Player.tsx
git commit -m "feat(iso): 아바타 연기 오버라이드 — 무대지시를 말풍선·하이라이트·서성임으로"
```

---

### Task 3: 브라우저 실증 + 문서 갱신

**Files:**
- Modify: `docs/PROJECT_STATUS.md`

**Interfaces:**
- Consumes: Task 1~2 결과물, M002 재생기(`scripts/workevents/replay.mjs`), dev 서버(5180), Playwright MCP.
- Produces: 연기 장면 스크린샷 증거 + 상태 문서 갱신.

- [ ] **Step 1: dev 서버(5180) 살아있는지 확인, 죽었으면 재시작** — `npm run dev:frontend -- --port 5180` (백그라운드).

- [ ] **Step 2: 재생기 루프 시작** — `node scripts/workevents/replay.mjs` (백그라운드).

- [ ] **Step 3: Playwright 실증** — `http://localhost:5180` 접속 → 15초 대기 → 스크린샷 A → 3초 대기 → 스크린샷 B → (승인 구간 39~48초 창을 노려) 스크린샷 C.
Expected:
- A·B: working 중인 아바타(Nova/Vega/Atlas)에게 ⚙ 말풍선, **A와 B에서 그 아바타의 x위치가 다름**(서성임 증거), 하이라이트 링.
- C: `⏸ 창업자 승인 대기…` 말풍선을 단 Vega가 **정지** 상태.
- 비연기 아바타(Orion/Iris/Lyra)는 평소 그대로(회귀 확인).

- [ ] **Step 4: 정리** — 재생기 종료(`pkill -f replay.mjs`), 마지막 완주 회분을 남기려면 `node scripts/workevents/replay.mjs --once` 1회.

- [ ] **Step 5: PROJECT_STATUS.md 갱신** — 07-07 슬라이스 ① 완료 항목 뒤에 추가:

```markdown
**→ 07-07 슬라이스 ②a 완료:** 아바타 최소 연기 — 안무가(`src/components/isometric/acting.ts` 순수함수: 아바타별 최신 이벤트→무대지시, decision은 같은 run 직전 연기자 귀속, TTL 90s) + Player 렌더 직전 오버라이드(⚙/⏸ 말풍선·하이라이트·±1타일 결정론 서성임·⏸=부동). 클라이언트 전용(서버 write 0·Frozen 유지), 새 그림 0장. Playwright 스크린샷으로 서성임 위치 변화·승인 정지 실증. 다음 = ②b(장소 이동·핸드오프 걸어가기·walkable 그래프) or B안(진짜 미니 Company OS).
```

- [ ] **Step 6: Commit + push**

```bash
git add docs/PROJECT_STATUS.md
git commit -m "docs: 슬라이스 ②a 완료 기록 (아바타 연기 실증)"
git push
```
