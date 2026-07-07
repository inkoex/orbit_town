# 가짜 workEvents 제너레이터 (M002 재생기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진짜 엔진 없이 M002 대본(12줄)을 시간차로 `workEvents`에 재생해, 빌보드 티커에 "회사의 하루"가 흐르는 전시를 검증한다.

**Architecture:** 대본(JSON) + 로컬 Node 재생기(`ConvexHttpClient`로 push, 회차마다 `clearSource`로 리셋, 기본 루프) + `clearSource` mutation 하나 추가. 프론트는 이미 티커가 `workEvents.list`를 구독하므로 **변경 0줄**.

**Tech Stack:** Convex 1.41 (`ConvexHttpClient`, `anyApi`), Node 18+ ESM(.mjs), jest(ts-jest ESM) — 대본 검증, vitest+convex-test — mutation 검증.

**Spec:** `docs/superpowers/specs/2026-07-07-fake-workevents-generator-design.md`

## Global Constraints

- 새 npm 의존성 추가 금지 — 기존 `convex` 패키지만 사용.
- `convex/workEventsContract.ts`, `convex/schema.ts`, `src/components/PixiGame.tsx` 수정 금지.
- AI Town 엔진(월드)은 Frozen 유지 — 재생기는 push/clearSource만 호출.
- `clearSource`는 `push`와 동일하게 "dev 공개 mutation, 공유 배포 전 auth 필수" 주석을 단다.
- tsconfig가 `**/*.ts`를 include하므로 새 테스트 파일은 `tsc` 타입체크를 통과해야 한다 (`npm run build`가 그린).
- jest 실행은 `npm test` (= `NODE_OPTIONS=--experimental-vm-modules jest --verbose`), vitest 실행은 `npx vitest run <파일>`.
- 대본 문구·순서는 스펙의 M002 표를 그대로 따른다 (임의 수정 금지).

---

### Task 1: `clearSource` mutation

**Files:**
- Modify: `convex/workEvents.ts` (파일 끝에 mutation 추가)
- Test: `convex/workEvents.vitest.ts` (신규)

**Interfaces:**
- Consumes: 기존 `workEvents` 테이블의 `sourceExternalId` 인덱스(`['source', 'externalId']` — source만으로 prefix 조회 가능), 기존 `api.workEvents.push`/`list`.
- Produces: `api.workEvents.clearSource({ source: string }) → { deleted: number }` — Task 3의 재생기가 회차마다 호출.

- [ ] **Step 1: Write the failing test**

`convex/workEvents.vitest.ts` 생성 (기존 `convex/engine/vacuumInputs.vitest.ts` 패턴을 따름):

```ts
/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { modules } from './test.modules';
import { api } from './_generated/api';

describe('workEvents.clearSource', () => {
  test('deletes only the requested source and returns the count', async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.workEvents.push, { source: 'fake', type: 'run_started', summary: 'a' });
    await t.mutation(api.workEvents.push, { source: 'fake', type: 'run_finished', summary: 'b' });
    await t.mutation(api.workEvents.push, { source: 'real', type: 'agent_message', summary: 'keep me' });

    const res = await t.mutation(api.workEvents.clearSource, { source: 'fake' });
    expect(res).toEqual({ deleted: 2 });

    const rest = await t.query(api.workEvents.list, {});
    expect(rest).toHaveLength(1);
    expect(rest[0].source).toBe('real');
  });

  test('clearing an absent source deletes nothing', async () => {
    const t = convexTest(schema, modules);
    const res = await t.mutation(api.workEvents.clearSource, { source: 'fake' });
    expect(res).toEqual({ deleted: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/workEvents.vitest.ts`
Expected: FAIL — `api.workEvents.clearSource`가 존재하지 않음 (타입 에러 또는 "Could not find function").

- [ ] **Step 3: Write minimal implementation**

`convex/workEvents.ts` 파일 끝에 추가:

```ts
// Dev-only reset for replay tooling: wipes ONE source's events (e.g. the fake
// generator clearing its previous round) without touching other sources' data.
// Same caveat as push: public mutation for the single-user dev deployment —
// must move behind auth before any shared deployment.
export const clearSource = mutation({
  args: { source: v.string() },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('workEvents')
      .withIndex('sourceExternalId', (q) => q.eq('source', args.source))
      .collect();
    await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
    return { deleted: rows.length };
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/workEvents.vitest.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: 기존 테스트 회귀 확인**

Run: `npm run test:convex`
Expected: 전부 PASS (기존 vitest 스위트에 영향 없음).

- [ ] **Step 6: Commit**

```bash
git add convex/workEvents.ts convex/workEvents.vitest.ts
git commit -m "feat(core): workEvents.clearSource — source별 리셋 (재생기용)"
```

---

### Task 2: M002 대본 JSON + 계약 준수 테스트

**Files:**
- Create: `scripts/workevents/m002.json`
- Test: `scripts/workevents/m002.test.ts` (신규, jest)

**Interfaces:**
- Consumes: `convex/workEventsContract.ts`의 `workEventType` (v.union — 런타임에 `.members[].value`로 어휘 추출 가능, 이 레포 convex 1.41에서 확인됨), `data/characters.ts`의 `isoDescriptions` (name: Nova·Orion·Vega·Lyra·Atlas·Iris).
- Produces: `scripts/workevents/m002.json` — 형태 `{ source: "fake", runPrefix: "m002", restSeconds: 5, script: Array<{ delay: number; agentName?: string; type: string; summary: string }> }`. Task 3의 재생기가 읽음.

- [ ] **Step 1: Write the failing test**

`scripts/workevents/m002.test.ts` 생성:

```ts
import { readFileSync } from 'node:fs';
import { workEventType } from '../../convex/workEventsContract';
import { isoDescriptions } from '../../data/characters';

type ScriptEntry = {
  delay: number;
  agentName?: string;
  type: string;
  summary: string;
  payload?: unknown;
};

type ScriptDoc = {
  source: string;
  runPrefix: string;
  restSeconds: number;
  script: ScriptEntry[];
};

// jest cwd = 레포 루트
const doc = JSON.parse(readFileSync('scripts/workevents/m002.json', 'utf8')) as ScriptDoc;

// 계약 어휘를 validator 자체에서 추출 — 하드코딩 복제 금지 (스펙 §검증).
const vocab = (workEventType as { members?: Array<{ value?: unknown }> }).members?.map(
  (m) => m.value,
) as string[];

describe('m002 대본 — workEvents 계약 준수', () => {
  test('validator에서 어휘 추출이 동작한다', () => {
    expect(vocab).toBeDefined();
    expect(vocab).toHaveLength(9);
    expect(vocab).toContain('run_started');
  });

  test('문서 envelope 필드', () => {
    expect(doc.source).toBe('fake');
    expect(doc.runPrefix.length).toBeGreaterThan(0);
    expect(doc.restSeconds).toBeGreaterThan(0);
    expect(doc.script.length).toBeGreaterThan(0);
  });

  test('모든 항목이 계약을 지킨다', () => {
    const cast = new Set(isoDescriptions.map((d) => d.name));
    for (const e of doc.script) {
      expect(vocab).toContain(e.type);
      expect(typeof e.summary).toBe('string');
      expect(e.summary.length).toBeGreaterThan(0);
      expect(Number.isFinite(e.delay)).toBe(true);
      expect(e.delay).toBeGreaterThanOrEqual(0);
      if (e.agentName !== undefined) {
        expect(cast.has(e.agentName)).toBe(true);
      }
    }
  });

  test('미션 아크: run_started로 시작, run_finished로 끝', () => {
    expect(doc.script[0].type).toBe('run_started');
    expect(doc.script[doc.script.length - 1].type).toBe('run_finished');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- m002`
Expected: FAIL — `ENOENT: no such file or directory ... m002.json`.

- [ ] **Step 3: Write the script data**

`scripts/workevents/m002.json` 생성 (스펙 M002 표 그대로 — 문구·순서·delay 수정 금지):

```json
{
  "source": "fake",
  "runPrefix": "m002",
  "restSeconds": 5,
  "script": [
    { "delay": 0, "agentName": "Atlas", "type": "run_started", "summary": "M002 시작 — \"Orbit 런칭 영상 제작·발행\"" },
    { "delay": 4, "agentName": "Atlas", "type": "task_assigned", "summary": "작업 분해: 리서치 → 대본 → 렌더 → 발행" },
    { "delay": 4, "agentName": "Nova", "type": "tool_call_started", "summary": "타깃 시청자·핵심 메시지 조사 중…" },
    { "delay": 5, "agentName": "Nova", "type": "tool_call_finished", "summary": "\"방향 있는 생산자\" 앵글 3개 도출" },
    { "delay": 4, "agentName": "Nova", "type": "agent_message", "summary": "마케팅에 전달 — audience-brief.md" },
    { "delay": 4, "agentName": "Vega", "type": "tool_call_started", "summary": "/vg-story 로 대본 생성 중…" },
    { "delay": 5, "agentName": "Vega", "type": "artifact_created", "summary": "대본+음성+자막 완성 — script.md, voice.mp3" },
    { "delay": 4, "agentName": "Vega", "type": "tool_call_started", "summary": "Remotion 렌더링 중…" },
    { "delay": 5, "agentName": "Vega", "type": "artifact_created", "summary": "orbit-launch.mp4 렌더 완료" },
    { "delay": 4, "type": "decision_recorded", "summary": "⏸ 창업자 승인 대기: \"유튜브 발행?\"" },
    { "delay": 5, "agentName": "Vega", "type": "status_changed", "summary": "승인됨 — 발행 완료" },
    { "delay": 4, "agentName": "Atlas", "type": "run_finished", "summary": "M002 완료" }
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- m002`
Expected: PASS (4 tests).

- [ ] **Step 5: 타입체크 확인** (tsconfig가 `**/*.ts`를 include하므로 새 테스트가 빌드를 깨지 않는지)

Run: `npx tsc --noEmit`
Expected: 에러 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/workevents/m002.json scripts/workevents/m002.test.ts
git commit -m "feat(core): M002 대본 + 계약 준수 테스트 (가짜 제너레이터 데이터)"
```

---

### Task 3: 재생기 `replay.mjs`

**Files:**
- Create: `scripts/workevents/replay.mjs`

**Interfaces:**
- Consumes: `scripts/workevents/m002.json` (Task 2의 형태), `api.workEvents.push`(기존 — args는 `workEventFields`, 반환 `{sequence, deduped}`), `api.workEvents.clearSource`(Task 1), `.env.local`의 `VITE_CONVEX_URL`.
- Produces: CLI — `node scripts/workevents/replay.mjs [--once]`. 기본 루프(회차 리셋→재생→`restSeconds` 휴식→반복), `--once`는 1회 후 종료.

- [ ] **Step 1: Write the replayer**

`scripts/workevents/replay.mjs` 생성:

```js
#!/usr/bin/env node
// Fake workEvents generator — replays the M002 script into the deployment's
// workEvents table so the billboard ticker shows "a company's day" without any
// real engine. Spec: docs/superpowers/specs/2026-07-07-fake-workevents-generator-design.md
//
// Usage:
//   node scripts/workevents/replay.mjs          # reset → replay → rest → repeat
//   node scripts/workevents/replay.mjs --once   # single replay, then exit
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const here = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(readFileSync(join(here, 'm002.json'), 'utf8'));

function deploymentUrl() {
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  const envFile = readFileSync(join(here, '../../.env.local'), 'utf8');
  const line = envFile
    .split('\n')
    .find((l) => l.startsWith('VITE_CONVEX_URL='));
  if (!line) throw new Error('VITE_CONVEX_URL not found (env var or .env.local)');
  return line.slice('VITE_CONVEX_URL='.length).trim();
}

const client = new ConvexHttpClient(deploymentUrl());
const sleep = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));

async function pushWithRetry(args) {
  try {
    return await client.mutation(anyApi.workEvents.push, args);
  } catch (err) {
    console.warn(`  push failed (${err?.message ?? err}), retrying once…`);
    try {
      return await client.mutation(anyApi.workEvents.push, args);
    } catch (err2) {
      console.error(`  push failed again, skipping line: ${err2?.message ?? err2}`);
      return null;
    }
  }
}

async function replayOnce(round) {
  const { deleted } = await client.mutation(anyApi.workEvents.clearSource, {
    source: doc.source,
  });
  console.log(`round ${round}: cleared ${deleted} old '${doc.source}' events`);
  for (const [i, entry] of doc.script.entries()) {
    await sleep(entry.delay);
    const res = await pushWithRetry({
      source: doc.source,
      type: entry.type,
      ...(entry.agentName !== undefined ? { agentName: entry.agentName } : {}),
      summary: entry.summary,
      ...(entry.payload !== undefined ? { payload: entry.payload } : {}),
      externalId: `${doc.runPrefix}-r${round}-s${i + 1}`,
      externalRunId: `${doc.runPrefix}-r${round}`,
      sourceTimestamp: Date.now(),
    });
    if (res) {
      const dedup = res.deduped ? ' (deduped)' : '';
      console.log(`  [${i + 1}/${doc.script.length}] ${entry.agentName ?? 'SYS'} · ${entry.summary}${dedup}`);
    }
  }
}

const once = process.argv.includes('--once');
let round = 1;
for (;;) {
  await replayOnce(round);
  if (once) break;
  console.log(`round ${round} done — resting ${doc.restSeconds}s (Ctrl+C to stop)`);
  await sleep(doc.restSeconds);
  round += 1;
}
console.log('done.');
```

- [ ] **Step 2: dev 배포에 함수 반영** (Task 1의 clearSource가 클라우드 dev에 아직 없음)

Run: `npx convex dev --once`
Expected: 성공적으로 함수 push, 종료. (월드는 Frozen 유지 — 함수 배포는 엔진을 깨우지 않음.)

- [ ] **Step 3: 1회 재생으로 라이브 검증** (~48초 소요)

Run: `node scripts/workevents/replay.mjs --once`
Expected: `round 1: cleared N old 'fake' events` 후 12줄이 4~5초 간격으로 순서대로 출력, 마지막 `done.`.

- [ ] **Step 4: DB 상태 확인**

Run: `npx convex run workEvents:list '{"count": 15}'`
Expected: source `"fake"`인 이벤트 12건, sequence 내림차순으로 최신이 `run_finished`(“M002 완료”). `externalRunId: "m002-r1"`.

- [ ] **Step 5: 리셋 동작 확인** (한 번 더 돌리면 이전 회차가 지워지는지)

Run: `node scripts/workevents/replay.mjs --once` 실행 후 `npx convex run workEvents:list '{"count": 30}'`
Expected: fake 이벤트는 여전히 **12건뿐** (24건 아님 — clearSource가 이전 회차를 지움).

- [ ] **Step 6: Commit**

```bash
git add scripts/workevents/replay.mjs
git commit -m "feat(core): M002 재생기 — 가짜 workEvents를 시간차 push (루프/--once)"
```

---

### Task 4: 브라우저 실증 + 상태 문서 갱신

**Files:**
- Modify: `docs/PROJECT_STATUS.md` (07-07 결정 항목에 완료 추가)

**Interfaces:**
- Consumes: Task 3의 재생기, 기존 티커(PixiGame이 `workEvents.list` 구독, `◢ AGENT · summary` 형식).
- Produces: 티커에 M002가 흐르는 스크린샷 증거 + 갱신된 상태 문서.

- [ ] **Step 1: 프론트 dev 서버 시작** (5173은 NeoTrader가 점유 — 5180 사용)

Run: `npm run dev:frontend -- --port 5180` (백그라운드)
Expected: Vite ready. (백엔드는 클라우드 dev라 별도 프로세스 불필요.)

- [ ] **Step 2: 재생기 루프 시작** (백그라운드)

Run: `node scripts/workevents/replay.mjs`
Expected: 회차 반복 재생 시작.

- [ ] **Step 3: Playwright MCP로 티커 실증** (브라우저 실증 원칙 — gstack browse는 PIXI에서 크래시, Playwright 사용)

`mcp__playwright__browser_navigate`로 `http://localhost:5180` 접속 → 10초 대기 → `browser_take_screenshot` → **~15초 뒤 한 번 더** 스크린샷.
Expected: 빌보드 티커에 `◢ NOVA · …` / `◢ VEGA · …` 줄이 보이고, 두 스크린샷 사이에 **다른 줄**이 떠 있음(흐름 증명). 승인 대기 줄(`◢ SYS · ⏸ 창업자 승인 대기…`)이 잡히면 이상적.

- [ ] **Step 4: 정리** — 재생기 Ctrl+C(또는 프로세스 종료), dev 서버 종료. fake 이벤트를 남기고 싶지 않으면:

Run: `npx convex run workEvents:clearSource '{"source": "fake"}'`
Expected: `{ deleted: 12 }`.

- [ ] **Step 5: PROJECT_STATUS.md 갱신** — "다음 한 칸"의 07-07 항목 끝에 아래 문장 추가:

```markdown
**→ 07-07 슬라이스 ① 완료:** 가짜 제너레이터 가동 (`scripts/workevents/replay.mjs`, M002 대본 = Orbit 런칭 영상 미션·videoGen 예고편). 티커에 "회사의 하루"가 흐르는 것 인앱 스크린샷 확인. `clearSource`로 회차 리셋, 루프/--once, 멱등 push. 프론트 변경 0줄·Frozen 유지. 다음 = ② 아바타 연기 매핑(대본의 agentName+type이 안무가 입력) or B안(진짜 최소 Company OS).
```

- [ ] **Step 6: Commit**

```bash
git add docs/PROJECT_STATUS.md
git commit -m "docs: M002 재생기 슬라이스 완료 기록 (티커 실증)"
```
