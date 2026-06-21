# 감성·시각 레이어 (A v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI Town을 우주정거장 테마로 리스킨하고, 사용자가 프리메이드 아바타에 이름·성격을 붙여 커스텀 에이전트를 생성해 월드에서 살아 움직이는 걸 보게 한다.

**Architecture:** 기존 AI Town(Convex 엔진 + PixiJS 렌더링)을 **확장**한다. 엔진·메모리·대화·시뮬레이션 루프는 그대로 재사용하고, ① 에셋 교체(인덱스 보존 리페인트) ② 테마 전환 플래그 ③ `createAgent` 커스텀 경로 + 서버측 가드 ④ OpenRouter 단일 LLM ⑤ 생성 UI만 추가한다.

**Tech Stack:** TypeScript, Convex, React, PixiJS(@pixi/react), jest + ts-jest, OpenRouter API.

## Global Constraints

- **에셋 라이선스**: 상업적 사용 가능(CC0 등)만 사용. 출처·라이선스·attribution을 `data/assets/CREDITS.md`에 기록.
- **스키마 변경 금지**: 기존 `playerDescriptions`{name, description, character}, `agentDescriptions`{identity, plan} 필드만 재사용. 새 테이블·schema.ts 변경 없음.
- **기존 folk 경로 무손상**: 기존 `createAgent({descriptionIndex})` 및 folk 캐릭터/맵이 계속 동작해야 함.
- **서버측 검증이 신뢰 경계**: 클라이언트 검증은 UX용일 뿐, 모든 제한은 서버(Convex 핸들러)에서 강제.
- **LLM = OpenRouter 단일 공급자**: 채팅+임베딩 모두 OpenRouter. 역할별 다중 모델 라우팅은 범위 외(조각 C).
- **실행**: `npm run dev` 하나로 backend(convex dev)+frontend(vite)+init 모두 구동. 별도 `npx convex dev` 금지.
- **타일 리스킨**: 기존 atlas 인덱스 배치 보존 리페인트만. 타일셋 단순 교체(인덱스 변경) 금지.
- **iso 추상화 금지**: v1은 평면(top-down). 좌표 변환 추상화/유틸 도입하지 않음.

---

## File Structure

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `data/assets/CREDITS.md` | 에셋 출처·라이선스 기록 | 신규 |
| `public/assets/space-folk.png` | 우주 캐릭터 스프라이트 시트 PNG | 신규 |
| `public/assets/space-tiles.png` | 인덱스 보존 우주 타일셋 PNG | 신규 |
| `data/spritesheets/s1.ts` … `s8.ts` | 우주 캐릭터 프레임 데이터 | 신규 |
| `data/spaceCharacters.ts` | 우주 `Descriptions`/`characters` 정의 | 신규 |
| `data/characters.ts` | folk + space를 모아 활성 세트 export | 수정 |
| `data/space.ts` | 인덱스 보존 우주 맵(기존 gentle 레이아웃 복제 + 우주 타일셋 경로) | 신규 |
| `convex/util/theme.ts` | `WORLD_THEME` 플래그 → 활성 세트 선택(순수 함수) | 신규 |
| `convex/init.ts` | 테마 플래그로 맵/Descriptions 분기 | 수정 |
| `convex/constants.ts` | `MAX_AGENTS`, 필드 길이 한계 상수 | 수정 |
| `convex/aiTown/createAgentValidation.ts` | 커스텀 에이전트 입력 검증(순수 함수) | 신규 |
| `convex/aiTown/createAgentValidation.test.ts` | 검증 함수 jest 테스트 | 신규 |
| `convex/aiTown/agentInputs.ts` | `createAgent` index+custom 분기 | 수정 |
| `convex/util/llm.ts` | OpenRouter 임베딩 차원 검증 조정 | 수정 |
| `src/components/AgentCreator.tsx` | 생성 모달(아바타 그리드 + 폼) | 신규 |
| `src/components/Game.tsx` | 우측 패널에 "에이전트 만들기" 버튼/모달 | 수정 |
| `src/components/PlayerDetails.tsx` | identity/plan 표시 추가 | 수정 |

---

## Phase 0 — 에셋 수급 (선행 조건)

### Task 0: 우주 에셋 확보 및 등록 데이터 작성

**Files:**
- Create: `public/assets/space-folk.png`, `public/assets/space-tiles.png`
- Create: `data/spritesheets/s1.ts` … `data/spritesheets/s8.ts`
- Create: `data/assets/CREDITS.md`

**Interfaces:**
- Produces: `public/assets/space-folk.png`(우주 캐릭터 6~8종, 32x32, 4방향 걷기), `public/assets/space-tiles.png`(기존 `public/assets/*` 타일셋과 **동일 atlas 배치·동일 픽셀 크기**, 우주 톤 리페인트), `data/spritesheets/s1..s8.ts`(각각 `export const data` — 기존 `data/spritesheets/f1.ts`와 동일한 `SpritesheetData` 구조).

- [ ] **Step 1: 기존 스프라이트 데이터 구조 확인**

`data/spritesheets/f1.ts`와 `data/spritesheets/types.ts`를 열어 `SpritesheetData` 형태(frames, animations, meta)를 파악한다. 새 우주 스프라이트는 이 구조를 그대로 따른다.

- [ ] **Step 2: 상업적 사용 가능 에셋 확보**

CC0/상업적 사용 가능한 32x32 우주(우주비행사 등) 캐릭터 스프라이트 6~8종과, 기존 타일셋과 호환되는 우주 타일 아트를 확보한다. 출처 후보: OpenGameArt(CC0 필터), itch.io(라이선스 확인), Kenney.nl(CC0). 캐릭터는 4방향(상하좌우) 걷기 프레임을 포함해야 한다.

- [ ] **Step 3: 타일셋 인덱스 보존 확인**

`space-tiles.png`는 기존 타일셋(`public/assets/gentle-obj.png` 등, `data/gentle.js`의 `tilesetpath`가 가리키는 파일)과 **같은 가로/세로 타일 수·같은 타일 크기**여야 한다. 즉 동일 인덱스 위치에 대응하는 우주 타일이 그려져야 맵이 깨지지 않는다. (다른 배치를 쓰려면 이 계획 범위를 벗어남.)

- [ ] **Step 4: 스프라이트시트 데이터 작성**

각 우주 캐릭터마다 `data/spritesheets/s1.ts` … 형태로 프레임/애니메이션 데이터를 작성한다(`f1.ts`를 템플릿으로). PNG 내 좌표와 프레임 이름이 일치해야 한다.

- [ ] **Step 5: CREDITS.md 작성**

```markdown
# Asset Credits

## Character sprites (public/assets/space-folk.png)
- Source: <URL>
- License: CC0 / <license>
- Author: <name>

## Tileset (public/assets/space-tiles.png)
- Source: <URL>
- License: CC0 / <license>
- Author: <name>
```

- [ ] **Step 6: 검증 — 파일 존재 및 라이선스 기록**

Run: `ls public/assets/space-folk.png public/assets/space-tiles.png data/spritesheets/s1.ts && cat data/assets/CREDITS.md`
Expected: 모든 파일 존재, CREDITS.md에 상업적 사용 가능 라이선스 명시.

- [ ] **Step 7: Commit**

```bash
git add public/assets/space-folk.png public/assets/space-tiles.png data/spritesheets/ data/assets/CREDITS.md
git commit -m "assets: add space-themed sprites and tileset (Phase 0)"
```

---

## Phase 1 — 테마 전환 인프라

### Task 1: 우주 캐릭터 정의 + 활성 세트 선택기

**Files:**
- Create: `data/spaceCharacters.ts`
- Modify: `data/characters.ts`
- Create: `convex/util/theme.ts`
- Create: `convex/util/theme.test.ts`

**Interfaces:**
- Consumes: `data/spritesheets/s1..s8.ts` (Task 0).
- Produces:
  - `data/spaceCharacters.ts` → `export const spaceDescriptions: Array<{name, character, identity, plan}>`, `export const spaceCharacters: Array<{name, textureUrl, spritesheetData, speed}>`.
  - `data/characters.ts` → 기존 `export const Descriptions`, `export const characters` 유지 + `export const folkDescriptions`, `export const folkCharacters`(별칭).
  - `convex/util/theme.ts` → `export type WorldTheme = 'folk' | 'space'; export function resolveTheme(raw: string | undefined): WorldTheme`.

- [ ] **Step 1: 테마 선택기 실패 테스트 작성**

Create `convex/util/theme.test.ts`:

```typescript
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
  test('defaults to folk when unset', () => {
    expect(resolveTheme(undefined)).toBe('folk');
  });
  test('returns space when set to space', () => {
    expect(resolveTheme('space')).toBe('space');
  });
  test('falls back to folk on unknown value', () => {
    expect(resolveTheme('banana')).toBe('folk');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- theme.test`
Expected: FAIL — "Cannot find module './theme'".

- [ ] **Step 3: 테마 선택기 구현**

Create `convex/util/theme.ts`:

```typescript
export type WorldTheme = 'folk' | 'space';

export function resolveTheme(raw: string | undefined): WorldTheme {
  return raw === 'space' ? 'space' : 'folk';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- theme.test`
Expected: PASS (3 tests).

- [ ] **Step 5: 우주 캐릭터 정의 작성**

Create `data/spaceCharacters.ts` (folk 구조를 그대로 따름, `s1..s8` import):

```typescript
import { data as s1 } from './spritesheets/s1';
import { data as s2 } from './spritesheets/s2';
import { data as s3 } from './spritesheets/s3';
import { data as s4 } from './spritesheets/s4';
import { data as s5 } from './spritesheets/s5';
import { data as s6 } from './spritesheets/s6';

export const spaceDescriptions = [
  { name: 'Nova', character: 's1', identity: `Nova is a curious station botanist who loves rare alien plants and talks to them.`, plan: 'You want to catalogue every plant on the station.' },
  { name: 'Orion', character: 's2', identity: `Orion is a gruff veteran pilot who has seen too many close calls. Short answers, dry humor.`, plan: 'You want to keep everyone safe.' },
  { name: 'Vega', character: 's3', identity: `Vega is an over-caffeinated systems engineer who explains everything with metaphors.`, plan: 'You want to optimize the station.' },
  { name: 'Lyra', character: 's4', identity: `Lyra is a dreamy navigator who is obsessed with distant galaxies and old star maps.`, plan: 'You want to chart a new route home.' },
  { name: 'Atlas', character: 's5', identity: `Atlas is a stoic cargo chief who secretly writes poetry about the void.`, plan: 'You want quiet and order.' },
  { name: 'Iris', character: 's6', identity: `Iris is a chatty comms officer who knows all the station gossip.`, plan: 'You want to hear everything first.' },
];

export const spaceCharacters = [
  { name: 's1', textureUrl: '/ai-town/assets/space-folk.png', spritesheetData: s1, speed: 0.1 },
  { name: 's2', textureUrl: '/ai-town/assets/space-folk.png', spritesheetData: s2, speed: 0.1 },
  { name: 's3', textureUrl: '/ai-town/assets/space-folk.png', spritesheetData: s3, speed: 0.1 },
  { name: 's4', textureUrl: '/ai-town/assets/space-folk.png', spritesheetData: s4, speed: 0.1 },
  { name: 's5', textureUrl: '/ai-town/assets/space-folk.png', spritesheetData: s5, speed: 0.1 },
  { name: 's6', textureUrl: '/ai-town/assets/space-folk.png', spritesheetData: s6, speed: 0.1 },
];
```

(주의: `textureUrl`의 `/ai-town/assets/` 접두사는 기존 folk와 동일 규약 — `data/characters.ts`의 기존 `textureUrl` 값을 그대로 따를 것.)

- [ ] **Step 6: characters.ts에서 두 세트 모두 export**

Modify `data/characters.ts` — 파일 맨 끝에 추가:

```typescript
export { spaceDescriptions, spaceCharacters } from './spaceCharacters';
// 기존 export 유지: Descriptions, characters (= folk)
export const folkDescriptions = Descriptions;
export const folkCharacters = characters;
```

- [ ] **Step 7: 타입체크 + 테스트**

Run: `npm test -- theme.test && npx tsc --noEmit`
Expected: 테스트 PASS, 타입 에러 없음.

- [ ] **Step 8: Commit**

```bash
git add data/spaceCharacters.ts data/characters.ts convex/util/theme.ts convex/util/theme.test.ts
git commit -m "feat: add space character set and theme resolver"
```

---

### Task 2: 우주 맵 정의 + init 테마 분기

**Files:**
- Create: `data/space.ts`
- Modify: `convex/init.ts`

**Interfaces:**
- Consumes: `resolveTheme` (Task 1), `spaceDescriptions`/`spaceCharacters` (Task 1), `public/assets/space-tiles.png` (Task 0).
- Produces: `data/space.ts` (기존 `data/gentle.js`와 **동일한 export 구조**: `mapwidth, mapheight, tilesetpath, tilesetpxw, tilesetpxh, tiledim, bgtiles, objmap, ...` — 단 `tilesetpath`만 `space-tiles.png`로, bg/obj 인덱스는 gentle 그대로 복제).

- [ ] **Step 1: gentle 맵의 export 구조 확인**

`data/gentle.js`를 열어 `init.ts`가 사용하는 모든 export(`mapwidth, mapheight, tilesetpath, tilesetpxw, tilesetpxh, tiledim, bgtiles, objmap, animatedsprites` 등)를 확인한다.

- [ ] **Step 2: 우주 맵 작성 (인덱스 보존)**

Create `data/space.ts`: `data/gentle.js`의 내용을 복제하되 `tilesetpath`만 `/ai-town/assets/space-tiles.png`로 바꾼다. **bg/obj 타일 인덱스 배열은 그대로** 둔다(인덱스 보존 원칙). 타일셋 픽셀 크기(`tilesetpxw/pxh`)가 새 PNG와 일치하는지 확인.

- [ ] **Step 3: init.ts 테마 분기 구현**

Modify `convex/init.ts` — 상단 import 교체:

```typescript
import { resolveTheme } from './util/theme';
import * as gentleMap from '../data/gentle';
import * as spaceMap from '../data/space';
import { folkDescriptions, spaceDescriptions } from '../data/characters';

const theme = resolveTheme(process.env.WORLD_THEME);
const map = theme === 'space' ? spaceMap : gentleMap;
const Descriptions = theme === 'space' ? spaceDescriptions : folkDescriptions;
```

(기존 `import { Descriptions } from '../data/characters'`와 `import * as map from '../data/gentle'` 라인을 위 코드로 대체. 나머지 `map.*` / `Descriptions.*` 사용처는 변수명이 같아 변경 불필요.)

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 5: folk 모드 무손상 확인**

Run: `npm run dev` (WORLD_THEME 미설정) → 브라우저에서 기존 folk 타운이 정상 표시·동작하는지 확인. 종료.
Expected: 기존과 동일.

- [ ] **Step 6: 우주 모드 확인**

먼저 깨끗한 상태로: `npx convex run testing:wipeAllTables`.
`WORLD_THEME=space`로 설정 후 재초기화: `npx convex env set WORLD_THEME space` 그리고 `npm run dev`.
Expected: 검은 우주 톤 타일맵이 **깨짐 없이** 표시되고, 우주 캐릭터(Nova 등)가 등장·이동·대화.

- [ ] **Step 7: Commit**

```bash
git add data/space.ts convex/init.ts
git commit -m "feat: add space map and WORLD_THEME switch in init"
```

---

## Phase 2 — 우주 배경 연출

### Task 3: 검은 우주 + 별 배경 추가

**Files:**
- Modify: `src/components/PixiGame.tsx` 또는 `src/components/Game.tsx` (스테이지 배경)

**Interfaces:**
- Consumes: 기존 PixiJS Stage/Viewport.
- Produces: 맵 뒤에 깔리는 검은 우주 + 별 배경(시각 전용, 게임 로직 무관).

- [ ] **Step 1: 현재 Stage 배경색/레이어 확인**

`src/components/Game.tsx`의 `<Stage>` 설정과 `src/components/PixiGame.tsx`의 컨테이너 구조를 확인. 배경색 옵션(`options={{ backgroundColor }}`) 위치를 찾는다.

- [ ] **Step 2: 배경을 우주 톤으로**

`<Stage>`의 backgroundColor를 검은/짙은 남색(예: `0x05060f`)으로 설정. (우주 모드에서만 적용하려면 `WORLD_THEME`을 프론트에 노출하는 대신, v1은 단순히 어두운 배경으로 통일해도 무방 — folk 맵도 어두운 우주 배경 위에 떠 보이는 정도는 허용.)

- [ ] **Step 3: 별 레이어(선택) 추가**

맵 컨테이너 뒤에 별 텍스처 또는 반복 점 스프라이트를 낮은 알파로 추가(선택적, 시간 여유 시). 없으면 배경색만으로도 v1 충족.

- [ ] **Step 4: 검증 — 시각 확인**

Run: `npm run dev` → 우주 배경이 맵 주위로 보이고 맵 렌더가 깨지지 않음(스크린샷 저장).
Expected: 검은 우주 배경 위에 정거장 타일맵.

- [ ] **Step 5: Commit**

```bash
git add src/components/Game.tsx src/components/PixiGame.tsx
git commit -m "feat: dark space background for the stage"
```

---

## Phase 3 — createAgent 커스텀 경로 + 서버측 가드

### Task 4: 커스텀 에이전트 입력 검증 (순수 함수, TDD)

**Files:**
- Modify: `convex/constants.ts`
- Create: `convex/aiTown/createAgentValidation.ts`
- Create: `convex/aiTown/createAgentValidation.test.ts`

**Interfaces:**
- Produces:
  - `convex/constants.ts` → `export const MAX_AGENTS = 16; export const AGENT_NAME_MAX = 32; export const AGENT_IDENTITY_MAX = 1000; export const AGENT_PLAN_MAX = 500;`
  - `convex/aiTown/createAgentValidation.ts` → `export interface CustomAgentArgs { name: string; character: string; identity: string; plan: string; }` 와 `export function validateCustomAgent(args: CustomAgentArgs, ctx: { existingNames: string[]; agentCount: number; validCharacters: string[]; }): void` (위반 시 `throw new Error(...)`).

- [ ] **Step 1: 상수 추가**

Modify `convex/constants.ts` — 파일 끝에 추가:

```typescript
export const MAX_AGENTS = 16;
export const AGENT_NAME_MAX = 32;
export const AGENT_IDENTITY_MAX = 1000;
export const AGENT_PLAN_MAX = 500;
```

- [ ] **Step 2: 검증 실패 테스트 작성**

Create `convex/aiTown/createAgentValidation.test.ts`:

```typescript
import { validateCustomAgent } from './createAgentValidation';

const base = { name: 'Zoe', character: 's1', identity: 'curious', plan: 'explore' };
const ctx = { existingNames: ['Nova'], agentCount: 1, validCharacters: ['s1', 's2'] };

describe('validateCustomAgent', () => {
  test('accepts valid args', () => {
    expect(() => validateCustomAgent(base, ctx)).not.toThrow();
  });
  test('rejects empty name', () => {
    expect(() => validateCustomAgent({ ...base, name: '' }, ctx)).toThrow(/name/i);
  });
  test('rejects too-long name', () => {
    expect(() => validateCustomAgent({ ...base, name: 'x'.repeat(33) }, ctx)).toThrow(/name/i);
  });
  test('rejects duplicate name (case-insensitive)', () => {
    expect(() => validateCustomAgent({ ...base, name: 'nova' }, ctx)).toThrow(/exists/i);
  });
  test('rejects unknown character', () => {
    expect(() => validateCustomAgent({ ...base, character: 'zzz' }, ctx)).toThrow(/character/i);
  });
  test('rejects when at max agents', () => {
    expect(() => validateCustomAgent(base, { ...ctx, agentCount: 16 })).toThrow(/max/i);
  });
  test('rejects too-long identity', () => {
    expect(() => validateCustomAgent({ ...base, identity: 'x'.repeat(1001) }, ctx)).toThrow(/identity/i);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- createAgentValidation`
Expected: FAIL — module not found.

- [ ] **Step 4: 검증 함수 구현**

Create `convex/aiTown/createAgentValidation.ts`:

```typescript
import { MAX_AGENTS, AGENT_NAME_MAX, AGENT_IDENTITY_MAX, AGENT_PLAN_MAX } from '../constants';

export interface CustomAgentArgs {
  name: string;
  character: string;
  identity: string;
  plan: string;
}

export function validateCustomAgent(
  args: CustomAgentArgs,
  ctx: { existingNames: string[]; agentCount: number; validCharacters: string[] },
): void {
  const name = args.name?.trim() ?? '';
  if (name.length < 1 || name.length > AGENT_NAME_MAX) {
    throw new Error(`Agent name must be 1-${AGENT_NAME_MAX} characters.`);
  }
  if (ctx.existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    throw new Error(`An agent named "${name}" already exists.`);
  }
  if (!ctx.validCharacters.includes(args.character)) {
    throw new Error(`Invalid character: ${args.character}`);
  }
  if (!args.identity || args.identity.length > AGENT_IDENTITY_MAX) {
    throw new Error(`Agent identity must be 1-${AGENT_IDENTITY_MAX} characters.`);
  }
  if ((args.plan?.length ?? 0) > AGENT_PLAN_MAX) {
    throw new Error(`Agent plan must be at most ${AGENT_PLAN_MAX} characters.`);
  }
  if (ctx.agentCount >= MAX_AGENTS) {
    throw new Error(`Max agents (${MAX_AGENTS}) reached.`);
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- createAgentValidation`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add convex/constants.ts convex/aiTown/createAgentValidation.ts convex/aiTown/createAgentValidation.test.ts
git commit -m "feat: add custom-agent input validation with guards"
```

---

### Task 5: createAgent 핸들러 확장 (index + custom)

**Files:**
- Modify: `convex/aiTown/agentInputs.ts:119-154`

**Interfaces:**
- Consumes: `validateCustomAgent`, `CustomAgentArgs` (Task 4); `spaceCharacters`/`folkCharacters` 또는 `characters` (Task 1); `Player.join` (기존).
- Produces: 확장된 `createAgent` 인풋 — `args: { descriptionIndex?: number, custom?: {name, character, identity, plan} }`. 둘 중 하나 필수. 반환은 기존과 동일 `{ agentId }`.

- [ ] **Step 1: 현재 핸들러/충돌 검토**

`convex/aiTown/agentInputs.ts`의 `createAgent` 핸들러(119행)와 import부를 확인. `game.world.agents`(현재 에이전트 맵), `game.playerDescriptions`로 기존 이름 수집 방법을 파악.

- [ ] **Step 2: 핸들러를 union 인자로 교체**

Modify `convex/aiTown/agentInputs.ts` — `createAgent` 블록을 교체:

```typescript
  createAgent: inputHandler({
    args: {
      descriptionIndex: v.optional(v.number()),
      custom: v.optional(
        v.object({
          name: v.string(),
          character: v.string(),
          identity: v.string(),
          plan: v.string(),
        }),
      ),
    },
    handler: (game, now, args) => {
      let name: string, character: string, identity: string, plan: string;
      if (args.custom) {
        const existingNames = [...game.playerDescriptions.values()].map((d) => d.name);
        const validCharacters = characters.map((c) => c.name);
        validateCustomAgent(args.custom, {
          existingNames,
          agentCount: game.world.agents.size,
          validCharacters,
        });
        ({ name, character, identity, plan } = args.custom);
      } else if (args.descriptionIndex !== undefined) {
        const description = Descriptions[args.descriptionIndex];
        ({ name, character, identity, plan } = description);
      } else {
        throw new Error('createAgent requires descriptionIndex or custom');
      }
      const playerId = Player.join(game, now, name, character, identity);
      const agentId = game.allocId('agents');
      game.world.agents.set(
        agentId,
        new Agent({
          id: agentId,
          playerId,
          inProgressOperation: undefined,
          lastConversation: undefined,
          lastInviteAttempt: undefined,
          toRemember: undefined,
        }),
      );
      game.agentDescriptions.set(
        agentId,
        new AgentDescription({ agentId, identity, plan }),
      );
      return { agentId };
    },
  }),
```

- [ ] **Step 3: import 추가**

`convex/aiTown/agentInputs.ts` 상단에 추가:

```typescript
import { characters } from '../../data/characters';
import { validateCustomAgent } from './createAgentValidation';
```

(`Descriptions`는 이미 import되어 있음 — index 경로 유지용. `characters`가 folk/space 중 무엇을 가리키는지는 `data/characters.ts`의 활성 export를 따른다. v1에서 커스텀 character 화이트리스트는 활성 세트 기준.)

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (init.ts의 기존 `createAgent({descriptionIndex})` 호출이 여전히 유효.)

- [ ] **Step 5: index 경로 무손상 확인**

Run: `npx convex run testing:wipeAllTables` 후 `npm run dev`로 init 동작 확인 → 기본 에이전트가 정상 생성됨.
Expected: 기존과 동일하게 에이전트 생성.

- [ ] **Step 6: custom 경로 수동 테스트**

브라우저 콘솔이나 `npx convex run`으로 custom 인풋을 보내 에이전트 1명 생성(엔진 인풋 경로). 또는 Phase 5 UI 완성 후 통합 검증으로 미룬다. 최소: 잘못된 character/빈 이름이 서버에서 거부되는지 확인.
Expected: 유효 입력은 에이전트 생성, 위반 입력은 에러.

- [ ] **Step 7: Commit**

```bash
git add convex/aiTown/agentInputs.ts
git commit -m "feat: support custom agent creation in createAgent input"
```

---

## Phase 4 — LLM 설정 (OpenRouter)

### Task 6: OpenRouter 임베딩 차원 검증 조정

**Files:**
- Modify: `convex/util/llm.ts:7-35` (EMBEDDING_DIMENSION + 검증 switch)

**Interfaces:**
- Produces: 선택한 OpenRouter 임베딩 모델의 출력 차원에 맞춘 `EMBEDDING_DIMENSION`과, custom provider에서 그 차원을 허용하는 검증.

- [ ] **Step 1: 사용할 OpenRouter 임베딩 모델·차원 결정**

OpenRouter 모델 목록에서 임베딩 모델 하나 선택(예: OpenAI 호환 `text-embedding-3-small` 계열, 1536차원). 차원을 확정한다.

- [ ] **Step 2: EMBEDDING_DIMENSION 및 검증 조정**

`convex/util/llm.ts` 상단의 `EMBEDDING_DIMENSION`을 선택 모델 차원(예: 1536)으로 설정. custom provider 경로(`LLM_API_URL` 설정 시)에서 이 차원이 에러 없이 통과하도록 `validateEmbeddingDimension`/`detectEmbeddingDimension` 분기를 확인·수정한다. (이미 `OPENAI_EMBEDDING_DIMENSION = 1536` 케이스가 있으므로 1536 선택 시 추가 변경 최소.)

- [ ] **Step 3: 환경변수 문서화**

`.env.local` 또는 README에 기록(커밋 금지인 키 제외):

```
LLM_PROVIDER=custom
LLM_API_URL=https://openrouter.ai/api/v1
LLM_MODEL=<openrouter-chat-model>
LLM_EMBEDDING_MODEL=<openrouter-embedding-model>
# OPENROUTER key: npx convex env set LLM_API_KEY <key>
```

(실제 키 설정 명령은 `npx convex env set`로, 저장소엔 키를 넣지 않는다.)

- [ ] **Step 4: 타입체크 + 임베딩 동작 확인**

Run: `npx tsc --noEmit` 그리고 `npm run dev` 후 에이전트가 대화하며 메모리 임베딩 호출이 에러 없이 도는지 Convex 로그 확인.
Expected: 차원 불일치 에러 없음, 임베딩 생성 성공.

- [ ] **Step 5: Commit**

```bash
git add convex/util/llm.ts
git commit -m "chore: configure OpenRouter chat+embedding via custom provider"
```

---

## Phase 5 — 생성 UI

### Task 7: AgentCreator 모달 + 우측 패널 버튼

**Files:**
- Create: `src/components/AgentCreator.tsx`
- Modify: `src/components/Game.tsx:68-82`

**Interfaces:**
- Consumes: `useSendInput(engineId, 'createAgent')` (확장된 custom 인자, Task 5); 활성 `characters` 세트(아바타 그리드용).
- Produces: `src/components/AgentCreator.tsx` → `export function AgentCreator({ engineId }: { engineId: Id<'engines'> })` — 버튼 + 모달. 모달 폼: 아바타 선택(character 이름), name, identity, plan. 제출 시 `createAgent({ custom: {...} })`.

- [ ] **Step 1: AgentCreator 컴포넌트 작성**

Create `src/components/AgentCreator.tsx`:

```typescript
import { useState } from 'react';
import { Id } from '../../convex/_generated/dataModel';
import { useSendInput } from '../hooks/sendInput';
import { characters } from '../../data/characters';

export function AgentCreator({ engineId }: { engineId: Id<'engines'> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [character, setCharacter] = useState(characters[0]?.name ?? '');
  const [identity, setIdentity] = useState('');
  const [plan, setPlan] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const createAgent = useSendInput(engineId, 'createAgent');

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await createAgent({ custom: { name: name.trim(), character, identity, plan } });
      setOpen(false);
      setName(''); setIdentity(''); setPlan('');
    } catch (e: any) {
      setError(e.message ?? 'Failed to create agent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4">
      <button className="button text-white shadow-solid px-3 py-1" onClick={() => setOpen(true)}>
        + 에이전트 만들기
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-brown-800 text-brown-100 p-6 rounded w-96 max-w-[90vw]">
            <h2 className="text-lg mb-3">새 에이전트</h2>
            <label className="block text-sm mb-1">아바타</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {characters.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setCharacter(c.name)}
                  className={`border-2 p-1 ${character === c.name ? 'border-yellow-400' : 'border-transparent'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <input className="w-full mb-2 text-black px-2 py-1" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className="w-full mb-2 text-black px-2 py-1" placeholder="성격 (identity)" value={identity} onChange={(e) => setIdentity(e.target.value)} />
            <textarea className="w-full mb-2 text-black px-2 py-1" placeholder="계획 (plan)" value={plan} onChange={(e) => setPlan(e.target.value)} />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button className="button px-3 py-1" onClick={() => setOpen(false)} disabled={busy}>취소</button>
              <button className="button px-3 py-1" onClick={submit} disabled={busy || !name.trim() || !identity.trim()}>
                {busy ? '생성 중…' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

(주: 아바타 그리드는 v1에서 character 이름 버튼으로 시작. 시간 여유 시 `<Character>` 컴포넌트로 실제 스프라이트 미리보기로 개선 — 범위 외 권장.)

- [ ] **Step 2: Game.tsx 우측 패널에 삽입**

Modify `src/components/Game.tsx` — 우측 패널 `<PlayerDetails .../>` 바로 위에 추가:

```typescript
          <AgentCreator engineId={engineId} />
          <PlayerDetails
```

그리고 상단 import 추가:

```typescript
import { AgentCreator } from './AgentCreator';
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (`createAgent`의 custom 인자가 Task 5의 인풋 타입과 일치.)

- [ ] **Step 4: 검증 — UI로 생성**

Run: `npm run dev` → 우측 패널의 "에이전트 만들기" 클릭 → 아바타 선택 + 이름·성격·plan 입력 → 생성 → 월드에 에이전트 등장·이동·대화. 잘못된 입력(빈 이름/중복) 시 에러 메시지.
Expected: 정상 생성 및 서버 거부 동작.

- [ ] **Step 5: Commit**

```bash
git add src/components/AgentCreator.tsx src/components/Game.tsx
git commit -m "feat: AgentCreator modal for custom agent creation"
```

---

### Task 8: PlayerDetails에 identity/plan 표시

**Files:**
- Modify: `src/components/PlayerDetails.tsx`

**Interfaces:**
- Consumes: 선택된 에이전트의 `agentDescriptions`(identity, plan). 기존 컴포넌트에서 agent description을 어떻게 조회하는지 확인 후 사용.

- [ ] **Step 1: agentDescription 접근 방법 확인**

`src/components/PlayerDetails.tsx`에서 `game` 또는 query로 선택 player의 agent 및 그 description에 접근하는 경로 확인. (player → 해당 agent 찾기 → `game.agentDescriptions` 또는 worldState.)

- [ ] **Step 2: identity/plan 렌더 추가**

`PlayerDetails.tsx`의 `{!isMe && playerDescription?.description}` 표시 근처에, 해당 player가 에이전트면 identity/plan을 표시:

```typescript
{agentDescription && (
  <>
    <div className="mt-2"><span className="uppercase text-xs">Identity</span><p>{agentDescription.identity}</p></div>
    <div className="mt-2"><span className="uppercase text-xs">Plan</span><p>{agentDescription.plan}</p></div>
  </>
)}
```

(`agentDescription`는 선택 player의 agentId로 조회. 정확한 조회 코드는 Step 1에서 파악한 패턴을 따름.)

- [ ] **Step 3: 타입체크 + 시각 확인**

Run: `npx tsc --noEmit` 그리고 `npm run dev` → 커스텀 에이전트 클릭 시 identity/plan 표시.
Expected: identity/plan이 패널에 보임.

- [ ] **Step 4: Commit**

```bash
git add src/components/PlayerDetails.tsx
git commit -m "feat: show agent identity and plan in PlayerDetails"
```

---

## Phase 6 — 통합 검증

### Task 9: 엔드투엔드 검증 (스펙 §8)

**Files:** (없음 — 검증만)

- [ ] **Step 1: 깨끗한 우주 모드 기동**

Run: `npx convex run testing:wipeAllTables` → `npx convex env set WORLD_THEME space` → `npm run dev`.
Expected: 검은 우주 배경 + 정거장 타일(깨짐 없음) + 우주 기본 에이전트 등장.

- [ ] **Step 2: 테마 시각 확인**

브라우저에서 우주 배경/타일/스프라이트 확인, 스크린샷 저장.

- [ ] **Step 3: 커스텀 생성 + 생활**

UI로 커스텀 에이전트 2~3명 생성 → 이동·성격대로 대화 확인(5~10분 관찰).

- [ ] **Step 4: 생성 가드 확인**

빈 이름 / 33자 초과 이름 / 중복 이름 / 비허용 character / 최대치(16) 초과 → 서버에서 거부됨.

- [ ] **Step 5: 영속성 확인**

페이지 새로고침 → 커스텀 에이전트 유지. 엔진 재시작(`npx convex run testing:stop` 후 재개) → 유지.

- [ ] **Step 6: folk 무손상 확인**

`npx convex env set WORLD_THEME folk` (또는 unset) → `npx convex run testing:wipeAllTables` → `npm run dev` → 기존 folk 타운 정상.

- [ ] **Step 7: wipe 초기화 검증**

`npx convex run testing:wipeAllTables` → init → 기본 에이전트로 정상 재초기화(커스텀은 사라짐 — 정상).

- [ ] **Step 8: 단위 테스트 전체 통과**

Run: `npm test`
Expected: 기존 + 신규(theme, createAgentValidation) 테스트 모두 PASS.

---

## Self-Review 메모

- **스펙 커버리지**: §4 IN 1(리스킨)=Task 0,2,3 / IN 2(아바타)=Task 0,1 / IN 3(생성 UI)=Task 5,7 / IN 4(영속성·스키마무변경)=Task 5 + 검증 Task 9-5 / IN 5(PlayerDetails)=Task 8 / IN 6(가드)=Task 4,5. §3 테마전환=Task 2. §6 LLM=Task 6. §8 검증=Task 9. §10 Phase 0=Task 0. 누락 없음.
- **iso/좌표 추상화**: 의도적으로 제외(Global Constraints).
- **타입 일관성**: `validateCustomAgent`/`CustomAgentArgs`(Task 4) ↔ createAgent custom 인자(Task 5) ↔ AgentCreator 제출(Task 7) 시그니처 일치.
