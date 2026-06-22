# Convex 저장 안정화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6개 AI 에이전트와 사용자 1명을 60분 실행해도 Convex Database Storage 증가량을 20MB 이하로 제한하면서 이동, 대화, 기억 기능을 유지한다.

**Architecture:** `worlds`는 복구용 권위 체크포인트로 30초마다 저장하고, `worldRenderStates`는 화면에 필요한 작은 고정 크기 상태만 1초마다 갱신한다. 예약 작업은 대형 map payload를 저장하지 않고 실행 시 최신 context를 조회하며, 처리 완료 input은 1시간 뒤 삭제한다. `patch`도 revision을 생성하므로 저장량 절감의 핵심은 patch 자체가 아니라 world당 한 문서와 제한된 payload다.

**Tech Stack:** TypeScript, Convex 1.41, React, PixiJS, Jest, Vitest, convex-test

## Global Constraints

- 기존 게임 좌표, pathfinding, 대화 거리 계산을 변경하지 않는다.
- `messages`, `memories`, `memoryEmbeddings`의 보존 정책은 변경하지 않는다.
- `worlds` 체크포인트에는 `historicalLocations`를 저장하지 않는다.
- `worldRenderStates`에는 map, description, identity, plan, conversation transcript를 저장하지 않는다.
- render snapshot은 world당 문서 하나만 유지하며 최초 `insert`, 이후 `patch`한다.
- 개발 배포의 `CONVEX_USAGE_GUARD=true`에서 연속 60분 후 자동 freeze한다.
- 각 Task는 지정 테스트와 타입체크를 통과한 뒤 해당 Task의 커밋만 만든다.
- 기존 dirty 파일을 임의로 stage, 수정, 되돌리지 않는다.
- 아이소메트릭 수직 조각은 마지막 60분 저장 검증을 통과한 뒤에만 시작한다.

## 파일 구조

- Create: `convex/aiTown/renderState.ts`, `convex/aiTown/renderState.vitest.ts`
- Create: `convex/aiTown/checkpointPolicy.ts`, `convex/aiTown/checkpointPolicy.vitest.ts`
- Create: `convex/aiTown/usageGuard.ts`, `convex/aiTown/usageGuard.vitest.ts`
- Create: `convex/engine/vacuumInputs.ts`, `convex/engine/vacuumInputs.vitest.ts`
- Create: `convex/convex.config.ts`, `convex/testModules.ts`, `vitest.config.ts`
- Modify: `jest.config.ts`
- Modify: `convex/aiTown/schema.ts`, `convex/engine/schema.ts`, `convex/schema.ts`
- Modify: `convex/aiTown/game.ts`, `convex/aiTown/main.ts`, `convex/aiTown/agent.ts`, `convex/aiTown/agentOperations.ts`
- Modify: `convex/engine/abstractGame.ts`, `convex/crons.ts`
- Modify: `convex/world.ts`, `convex/init.ts`, `convex/testing.ts`, `convex/constants.ts`
- Modify: `src/hooks/serverGame.ts`, `src/components/Player.tsx`
- Modify: `package.json`, `README.md`

---

### Task 1: Jest/Vitest 경계와 체크포인트 정책

**Files:**
- Create: `vitest.config.ts`
- Create: `convex/testModules.ts`
- Create: `convex/aiTown/checkpointPolicy.ts`
- Create: `convex/aiTown/checkpointPolicy.vitest.ts`
- Modify: `package.json`
- Modify: `jest.config.ts`
- Modify: `convex/constants.ts`

**Interfaces:**
- Produces: `CHECKPOINT_INTERVAL_MS = 30_000`, `INPUT_RETENTION_MS = 3_600_000`, `USAGE_GUARD_LIMIT_MS = 3_600_000`
- Produces: `checkpointFingerprint(world: SerializedWorld): string`
- Produces: `shouldCheckpoint(args): boolean`

- [ ] **Step 1: 테스트 의존성과 scripts를 추가한다**

```bash
npm install --save-dev convex-test@latest vitest@latest @edge-runtime/vm@latest
```

`package.json` scripts:

```json
"test:convex": "vitest run",
"test:all": "npm test -- --runInBand && npm run test:convex"
```

- [ ] **Step 2: Vitest 설정을 작성한다**

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    include: ['convex/**/*.vitest.ts'],
  },
});
```

`convex/testModules.ts`:

```typescript
/// <reference types="vite/client" />

export const modules = import.meta.glob('./**/*.ts');
```

DB function을 검증하는 테스트는 `convexTest(schema, modules)`를 사용한다. 순수 policy 테스트는 Vitest만 사용한다.

`jest.config.ts`에는 기존 Jest 테스트를 유지하면서 Vitest 전용 파일을 명시적으로 제외한다.

```typescript
const jestConfig: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  testPathIgnorePatterns: ['/node_modules/', '[.]vitest[.]ts$'],
};
```

- [ ] **Step 3: 실패 테스트를 작성한다**

`checkpointPolicy.vitest.ts`에서 30초 경과와 구조 fingerprint 변경은 true, 29,999ms 경과와 동일 fingerprint는 false인지 검증한다. 위치, facing, speed, typing만 바꾼 두 world의 fingerprint는 같고 player/agent/conversation 구성이 바뀌면 달라야 한다.

- [ ] **Step 4: 실패를 확인한다**

Run: `npx vitest run convex/aiTown/checkpointPolicy.vitest.ts`

Expected: FAIL with `Cannot find module './checkpointPolicy'`.

- [ ] **Step 5: 최소 구현을 작성한다**

`convex/constants.ts`:

```typescript
export const CHECKPOINT_INTERVAL_MS = 30_000;
export const INPUT_RETENTION_MS = 60 * 60 * 1000;
export const USAGE_GUARD_LIMIT_MS = 60 * 60 * 1000;
```

`checkpointFingerprint`는 `nextId`, 정렬된 player ID, agent ID, conversation별 `id/creator/participants/created/lastMessage/numMessages`만 직렬화한다. position, facing, speed, activity, `isTyping`, `historicalLocations`는 제외한다.

- [ ] **Step 6: 검증하고 커밋한다**

```bash
npx jest --listTests
npx vitest run convex/aiTown/checkpointPolicy.vitest.ts
npx tsc --noEmit
git add package.json package-lock.json jest.config.ts vitest.config.ts convex/testModules.ts convex/constants.ts convex/aiTown/checkpointPolicy.ts convex/aiTown/checkpointPolicy.vitest.ts
git commit -m "test: add Convex persistence policy harness"
```

Expected: Jest list에 `.vitest.ts` 파일이 0개, named Vitest PASS, TypeScript 0 errors.

---

### Task 2: Compact render state 스키마와 upsert

**Files:**
- Create: `convex/aiTown/renderState.ts`
- Create: `convex/aiTown/renderState.vitest.ts`
- Modify: `convex/aiTown/schema.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/_generated/api.d.ts` (codegen 결과)

**Interfaces:**
- Produces: `worldRenderStates` table indexed by `by_worldId`
- Produces: `buildRenderState(args): WorldRenderState`
- Produces: `upsertRenderState(ctx, state): Promise<void>`

- [ ] **Step 1: serializer 실패 테스트를 작성한다**

player 2명, typing conversation 1개, in-progress operation 1개 fixture로 players, `typingPlayerIds`, `thinkingPlayerIds`를 검증한다. JSON 결과에 `worldMap`, `identity`, `messages`가 없어야 한다.

`convexTest(schema, modules)`의 `t.run`으로 동일 worldId를 두 번 upsert해 `worldRenderStates` 문서가 정확히 하나이고 두 번째 simulationTime을 갖는지도 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run convex/aiTown/renderState.vitest.ts`

Expected: FAIL with missing module.

- [ ] **Step 3: validator와 테이블을 추가한다**

```typescript
{
  worldId: v.id('worlds'),
  engineGeneration: v.number(),
  simulationTime: v.number(),
  players: v.array(v.object({
    playerId: gameId,
    position: point,
    facing: vector,
    speed: v.number(),
    activity: v.optional(activity),
    historicalLocation: v.optional(v.bytes()),
  })),
  typingPlayerIds: v.array(gameId),
  thinkingPlayerIds: v.array(gameId),
}
```

`defineTable(...).index('by_worldId', ['worldId'])`로 등록한다.

- [ ] **Step 4: serializer와 upsert를 구현한다**

`buildRenderState`는 위 필드만 반환한다. `upsertRenderState`는 index로 기존 문서를 찾고 없으면 insert, 있으면 `worldId`를 제외한 필드를 `ctx.db.patch(existing._id, fields)`로 갱신한다. 주석에 patch도 revision을 만들며 compact payload가 저장 제한의 근거라고 기록한다.

- [ ] **Step 5: codegen, 테스트, 커밋을 실행한다**

```bash
npx convex codegen
npx vitest run convex/aiTown/renderState.vitest.ts
npx tsc --noEmit
git add convex/aiTown/renderState.ts convex/aiTown/renderState.vitest.ts convex/aiTown/schema.ts convex/schema.ts convex/_generated/api.d.ts
git commit -m "feat: add compact world render state"
```

Expected: renderState tests PASS, TypeScript 0 errors.

---

### Task 3: 1초 snapshot과 30초 checkpoint 분리

**Files:**
- Modify: `convex/aiTown/game.ts`
- Modify: `convex/aiTown/main.ts`
- Modify: `convex/engine/abstractGame.ts`
- Modify: `convex/aiTown/checkpointPolicy.vitest.ts`

**Interfaces:**
- Consumes: `shouldCheckpoint`, `upsertRenderState`
- Produces: internal mutations `saveWorldStep`, `finishWorldAction`

- [ ] **Step 1: checkpoint serializer 실패 테스트를 추가한다**

serialized checkpoint 결과에 `historicalLocations`가 없고 29,999ms에는 checkpoint가 생성되지 않는지 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run convex/aiTown/checkpointPolicy.vitest.ts`

Expected: new historical location assertion FAIL.

- [ ] **Step 3: step payload를 분리한다**

```typescript
type WorldStepPayload = {
  engineUpdate: EngineUpdate;
  renderState: WorldRenderState;
  checkpoint?: SerializedWorld;
  agentOperations: AgentOperation[];
  playerDescriptions?: SerializedPlayerDescription[];
  agentDescriptions?: SerializedAgentDescription[];
  worldMap?: SerializedWorldMap;
};
```

`renderState`는 매초 포함한다. `checkpoint`는 30초 경과 또는 fingerprint 변경 시에만 포함하고 `historicalLocations`는 제외한다. mutation 성공 뒤에만 `lastCheckpointAt`과 fingerprint를 갱신한다.

- [ ] **Step 4: `saveWorldStep` mutation을 구현한다**

순서는 generation 검증 및 engine update, render state upsert, optional world archive/replace, 변경된 description/map 저장, agent operation schedule로 고정한다. snapshot 저장이 실패하면 동일 payload로 한 번 재시도한다. 두 번째 실패 시 full checkpoint와 engine stop을 수행하고 throw한다.

- [ ] **Step 5: action 종료 checkpoint를 구현한다**

30초 loop 종료 후 `finishWorldAction`을 호출하고 성공한 경우에만 다음 `runStep`을 schedule한다. checkpoint 실패 시 다음 action을 시작하지 않는다.

- [ ] **Step 6: 검증하고 커밋한다**

```bash
npm run test:all
npx tsc --noEmit
npm run build
git add convex/aiTown/game.ts convex/aiTown/main.ts convex/engine/abstractGame.ts convex/aiTown/checkpointPolicy.vitest.ts
git commit -m "refactor: split render snapshots from world checkpoints"
```

Expected: Jest/Vitest 0 failed, TypeScript 0 errors, build exits 0.

---

### Task 4: 프론트엔드에 최신 render state 결합

**Files:**
- Modify: `convex/world.ts`
- Modify: `src/hooks/serverGame.ts`
- Modify: `src/components/Player.tsx`
- Create: `src/hooks/serverGame.test.ts`

**Interfaces:**
- Produces: `worldState` query result의 optional `renderState`
- Produces: `mergeRenderState(world, renderState, engineGeneration): World`
- Extends: `ServerGame.typingPlayerIds`, `ServerGame.thinkingPlayerIds`

- [ ] **Step 1: merge 실패 테스트를 작성한다**

checkpoint 위치 `{x:1,y:1}`, render 위치 `{x:4,y:3}` fixture에서 최신 generation이면 render 위치를 쓰고, 오래된 generation이면 checkpoint 위치를 유지해야 한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/hooks/serverGame.test.ts --runInBand`

Expected: FAIL because `mergeRenderState` is not exported.

- [ ] **Step 3: query와 merge를 구현한다**

`worldState`는 `worldRenderStates.by_worldId` 결과를 함께 반환한다. generation이 engine과 같을 때만 position, facing, speed, activity, historicalLocations를 overlay한다. player/agent/conversation 목록은 checkpoint를 사용한다. `Player.tsx`의 typing/thinking 판정은 새 Set을 사용하고 snapshot이 없으면 기존 checkpoint로 fallback한다.

- [ ] **Step 4: 검증하고 커밋한다**

```bash
npm test -- src/hooks/serverGame.test.ts --runInBand
npx tsc --noEmit
npm run build
git add convex/world.ts src/hooks/serverGame.ts src/hooks/serverGame.test.ts src/components/Player.tsx
git commit -m "feat: merge reactive render snapshots into server game"
```

Expected: merge tests PASS, TypeScript 0 errors, build exits 0.

---

### Task 5: Agent 예약 payload 축소

**Files:**
- Modify: `convex/aiTown/agent.ts`
- Modify: `convex/aiTown/agentOperations.ts`
- Create: `convex/aiTown/agentOperations.vitest.ts`

**Interfaces:**
- Produces: scheduled args `{ worldId, player, agent, operationId }`
- Produces: internal query `loadAgentOperationContext({worldId, playerId})`

- [ ] **Step 1: payload 실패 테스트를 작성한다**

scheduled args JSON이 16KB 미만이고 `tilesetpath`, `bgtiles`, `objectTiles`, `otherFreePlayers`를 포함하지 않는지 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run convex/aiTown/agentOperations.vitest.ts`

Expected: FAIL because current args contain map and candidates.

- [ ] **Step 3: 예약 인자를 축소한다**

`Agent.tick`은 map과 후보 배열을 scheduler args에서 제거한다. 작은 player/agent snapshot은 예약 시점의 acting agent 의사결정 상태(pathfinding, activity, cooldown)를 보존하는 권위 입력으로 유지한다.

- [ ] **Step 4: 실행 시 context를 조회한다**

`agentDoSomething` 시작 시 `loadAgentOperationContext`를 호출한다. query는 map과 conversation 참여 중이 아닌 후보 player 목록만 반환하며 acting player/agent를 다시 조회하지 않는다. 후보 위치에는 최신 render position을 overlay한다. action은 예약 인자의 player/agent snapshot과 query의 map/candidates를 결합하고, 결과 저장의 기존 `operationId` 검증을 유지한다.

- [ ] **Step 5: 검증하고 커밋한다**

```bash
npx vitest run convex/aiTown/agentOperations.vitest.ts
npm run test:all
npx tsc --noEmit
git add convex/aiTown/agent.ts convex/aiTown/agentOperations.ts convex/aiTown/agentOperations.vitest.ts
git commit -m "refactor: remove world map from scheduled agent payloads"
```

Expected: all tests PASS, TypeScript 0 errors.

---

### Task 6: 처리 완료 input의 1시간 vacuum

**Files:**
- Modify: `convex/engine/schema.ts`
- Modify: `convex/crons.ts`
- Create: `convex/engine/vacuumInputs.ts`
- Create: `convex/engine/vacuumInputs.vitest.ts`

**Interfaces:**
- Produces: inputs index `by_received`
- Produces: internal mutation `vacuumProcessedInputsPage({before, cursor})`

- [ ] **Step 1: 보존 조건 실패 테스트를 작성한다**

2시간 전 처리 완료 input은 삭제, 2시간 전 미처리 input은 유지, 30분 전 처리 완료 input은 유지하는 세 경우를 작성한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run convex/engine/vacuumInputs.vitest.ts`

Expected: FAIL because vacuum function is missing.

- [ ] **Step 3: paginated vacuum을 구현한다**

`by_received` index로 cutoff 이전 문서를 64개씩 paginate한다. 각 input의 engine을 읽고 `input.number <= engine.processedInputNumber`인 경우만 삭제한다. 다음 페이지가 있으면 동일 cutoff와 cursor로 continuation을 schedule한다. 기존 14일 generic vacuum 대상에서 inputs를 제거한다.

```typescript
crons.interval(
  'vacuum processed inputs',
  { hours: 1 },
  internal.engine.vacuumInputs.startVacuumProcessedInputs,
);
```

- [ ] **Step 4: 검증하고 커밋한다**

```bash
npx convex codegen
npx vitest run convex/engine/vacuumInputs.vitest.ts
npx tsc --noEmit
git add convex/engine/schema.ts convex/engine/vacuumInputs.ts convex/engine/vacuumInputs.vitest.ts convex/crons.ts convex/_generated/api.d.ts
git commit -m "feat: vacuum processed engine inputs after one hour"
```

Expected: all three retention cases PASS, TypeScript 0 errors.

---

### Task 7: 개발 배포 60분 usage guard

**Files:**
- Create: `convex/convex.config.ts`
- Create: `convex/aiTown/usageGuard.ts`
- Create: `convex/aiTown/usageGuard.vitest.ts`
- Modify: `convex/aiTown/schema.ts`
- Modify: `convex/aiTown/main.ts`
- Modify: `convex/init.ts`
- Modify: `convex/testing.ts`

**Interfaces:**
- Adds: `worldStatus.runStartedAt?: number`
- Produces: `usageGuardDecision({enabled, now, runStartedAt})`

- [ ] **Step 1: 순수 정책 실패 테스트를 작성한다**

enabled 상태에서 정확히 3,600,000ms면 freeze, disabled 상태에서는 7,200,000ms여도 continue인지 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run convex/aiTown/usageGuard.vitest.ts`

Expected: FAIL with missing module.

- [ ] **Step 3: typed env와 정책을 구현한다**

`convex/convex.config.ts`:

```typescript
import { defineApp } from 'convex/server';
import { v } from 'convex/values';

export default defineApp({
  env: {
    CONVEX_USAGE_GUARD: v.optional(v.string()),
  },
});
```

generated `env.CONVEX_USAGE_GUARD === 'true'` 판정과 순수 decision 함수를 분리한다.

- [ ] **Step 4: runtime에 연결한다**

init과 수동 unfreeze/start에서 `runStartedAt=Date.now()`를 patch한다. dead action 재시작은 기존 값을 유지한다. `finishWorldAction`은 full checkpoint 저장 후 guard를 검사하고, 시간이 지나면 `worldStatus.status='stoppedByDeveloper'`, `engine.running=false`로 patch하며 다음 action을 schedule하지 않는다. 로그 문구는 `usage guard: froze world after 60 minutes`로 고정한다.

- [ ] **Step 5: 검증하고 커밋한다**

```bash
npx convex codegen
npx vitest run convex/aiTown/usageGuard.vitest.ts
npm run test:all
npx tsc --noEmit
npm run build
git add convex/convex.config.ts convex/aiTown/usageGuard.ts convex/aiTown/usageGuard.vitest.ts convex/aiTown/schema.ts convex/aiTown/main.ts convex/init.ts convex/testing.ts convex/_generated/api.d.ts
git commit -m "feat: freeze development worlds after sixty minutes"
```

Expected: all tests PASS, TypeScript 0 errors, build exits 0.

---

### Task 8: 마이그레이션과 로컬 우선 실행 문서

**Files:**
- Modify: `README.md`
- Create: `docs/operations/convex-storage-verification.md`

**Interfaces:**
- Produces: export, deploy, reset, measurement runbook

- [ ] **Step 1: 로컬 우선 경로를 기록한다**

```bash
npx convex dev --local
npm run dev:frontend
```

클라우드 dev 장시간 실행 시 `npx convex env set CONVEX_USAGE_GUARD true`를 사용하고 production은 unset 또는 false로 둔다.

- [ ] **Step 2: 마이그레이션 순서를 기록한다**

기존 deployment export와 Usage 캡처, schema/code 배포, 첫 render state 확인, 첫 checkpoint 후 `historicalLocations` 제거 확인, message/memory/description 보존 확인, scheduled args에서 map 부재 확인 순서로 작성한다.

runbook에는 전후 export ZIP의 `<table>/documents.jsonl` uncompressed bytes를 비교하는 명령과 `npx convex data _scheduled_functions --limit 1000` 표본의 row/byte 수를 기록하는 절차를 포함한다.

- [ ] **Step 3: 문서를 검증하고 커밋한다**

```bash
rg "convex dev --local|CONVEX_USAGE_GUARD|20MB" README.md docs/operations/convex-storage-verification.md
git add README.md docs/operations/convex-storage-verification.md
git commit -m "docs: add Convex storage migration and verification runbook"
```

Expected: three search terms found.

---

### Task 9: 60분 통합 검증과 아이소 작업 게이트

**Files:**
- Modify: `docs/operations/convex-storage-verification.md`

**Interfaces:**
- Consumes: Tasks 1-8
- Produces: measured PASS/FAIL record

- [ ] **Step 1: 자동 검증을 다시 실행한다**

```bash
npm run test:all
npx tsc --noEmit
npm run build
```

Expected: 0 failed, 0 TypeScript errors, build exits 0.

- [ ] **Step 2: 초기 측정값을 기록한다**

초기화한 deployment에서 Database Storage, Database I/O, Function Calls, export archive bytes를 UTC timestamp와 함께 기록한다. export ZIP에서 `inputs`, `worlds`, `worldRenderStates`, `messages`, `memories`, `memoryEmbeddings`의 `documents.jsonl` uncompressed bytes를 각각 기록한다. `_scheduled_functions`는 CLI 표본 1,000개의 row 수와 출력 bytes를 별도 기록한다.

- [ ] **Step 3: 6 AI + 1 사용자로 60분 실행한다**

10분 간격으로 사용자/AI 이동, 대화와 메시지, memory 생성/검색을 확인한다. browser 종료 후 5분 내 inactive stop, 수동 unfreeze 후 새 60분 timer 시작도 확인한다.

- [ ] **Step 4: 종료 측정값을 기록한다**

Database Storage와 export 증가량, 위 여섯 application table의 개별 byte delta, `_scheduled_functions` 표본 row/byte delta, 정기 checkpoint 횟수, 이벤트 checkpoint 횟수, scheduled args 최대 bytes와 map 포함 여부, usage guard freeze timestamp를 기록한다. 성공/실패와 무관하게 모든 항목을 채운다.

- [ ] **Step 5: 게이트를 판정한다**

```text
Database Storage delta <= 20 MB
regular checkpoint calls <= 120/hour
scheduled agent payload contains map == false
movement/chat/memory regression == false
usage guard froze at 60 minutes == true
```

하나라도 실패하면 아이소 계획을 실행하지 않고 테이블별 증가량과 함수별 Database I/O를 “재측정 필요” 절에 기록한다.

- [ ] **Step 6: 검증 기록을 커밋한다**

```bash
git add docs/operations/convex-storage-verification.md
git commit -m "test: record Convex sixty minute storage verification"
```

---

## 자체 검토 결과

- 스펙의 checkpoint, render snapshot, compact operation, input vacuum, usage guard, migration, 60분 측정을 모두 Task에 연결했다.
- `patch`를 저장량 해결책으로 오해하지 않도록 Global Constraints와 Task 2에 revision 의미를 명시했다.
- frontend generation fallback과 checkpoint 실패 시 다음 action 중단을 포함했다.
- 사용자 메시지와 장기 기억 삭제는 포함하지 않았다.
- 생성 함수와 테이블 이름을 후속 Task에서 일관되게 사용했다.
- Jest는 기존 `*.test.ts`, Vitest는 Convex `*.vitest.ts`만 수집하도록 경계를 고정했다.
- agent snapshot과 실행 시 조회 context의 책임을 분리하고, 성공 시에도 테이블별 저장량을 기록하도록 했다.
