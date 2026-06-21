# 감성·시각 레이어 (A v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**상태:** 동결(외부 리뷰 3회 반영). **아바타 크기 = 32×32 확정**(프로토타입으로 결정 — 가장 쉬운 시작, 추후 iso 전환 가능성이 높아 에셋은 어차피 재활용 불가 → 과투자 금지).

**에셋 전략(중요):** 지금 수집하는 에셋은 **버려질 가능성이 높다**(iso 전환 시 재제작). 따라서:
- **메커니즘을 먼저 검증**하고 아트는 마지막에 싸게 얹는다 → 구현은 **에셋 비의존 Task(Phase 1 theme.ts·init 분기 일부, Phase 3 검증/핸들러, Phase 4 LLM, Phase 5 UI, Task 3 별배경)부터** 진행.
- v1 우주 캐릭터는 **별도 고급 아트 없이** 빠른 CC0 32×32 세트 또는 임시로 기존 folk를 placeholder로 써서 파이프라인부터 통과시킨다.
- 타일 리스킨도 **최소**(어두운 배경 + 가벼운 리컬러)로 — 완성도보다 "깨지지 않고 도는 것" 우선.

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

- [ ] **Step 3: 타일셋 atlas 정확 명세 (⚠️ Codex 3차 리뷰 #1)**

`data/gentle.js` 확인 결과 기존 타일셋은 다음과 같다(이 수치를 **정확히** 맞춰야 인덱스가 보존된다):
- 파일: `/ai-town/assets/gentle-obj.png`
- 크기: **1440 × 1024 px**, 타일 **32 × 32 px** → **45열 × 32행 = 1440 타일**
- 각 인덱스 `tiles[x + y*45]`가 atlas의 (x*32, y*32) 위치를 가리킴(`PixiStaticMap.tsx`).

따라서 `space-tiles.png`는 **동일한 1440×1024 / 32px 그리드**에서, **각 셀을 우주 톤으로 리페인트**해야 한다. 일반 우주 타일셋을 그대로 내려받으면 배치가 달라 맵이 깨진다 → **gentle-obj.png를 베이스로 셀 단위 리컬러/리드로우**가 현실적 방법(이미지 편집 또는 도트 작업). 실제 사용 인덱스만 칠해도 됨(`data/gentle.js`의 bgtiles/objmap에 등장하는 인덱스 집합).

- [ ] **Step 4: 스프라이트시트 데이터 작성 + placeholder 교체**

각 우주 캐릭터마다 `data/spritesheets/s1.ts` … `s6.ts`로 프레임/애니메이션 데이터를 작성한다(`f1.ts`를 템플릿으로). PNG 내 좌표와 프레임 이름이 일치해야 한다.

그런 다음 **Task 1에서 넣어둔 placeholder를 실제 에셋으로 교체**: `data/spaceCharacters.ts`의 import를 `./spritesheets/f1..f6` → `./spritesheets/s1..s6`로, `textureUrl`을 `/ai-town/assets/32x32folk.png` → `/ai-town/assets/space-folk.png`로 변경. (캐릭터 이름 `s1`~`s6`은 불변.) 교체 후 `npx tsc --noEmit` 통과 확인.

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
git add public/assets/space-folk.png public/assets/space-tiles.png data/spritesheets/ data/spaceCharacters.ts data/assets/CREDITS.md
git commit -m "assets: add space sprites/tileset and swap placeholders (Phase 0)"
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
  - `convex/util/theme.ts` → `export type WorldTheme = 'folk' | 'space'; export function resolveTheme(raw: string | undefined): WorldTheme; export function themeFromTileSetUrl(url: string): WorldTheme`.

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

import { themeFromTileSetUrl } from './theme';

describe('themeFromTileSetUrl', () => {
  test('space when url has space-tiles', () => {
    expect(themeFromTileSetUrl('/ai-town/assets/space-tiles.png')).toBe('space');
  });
  test('folk otherwise', () => {
    expect(themeFromTileSetUrl('/ai-town/assets/gentle-obj.png')).toBe('folk');
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

// init 시드 시점: 환경변수로 어떤 맵/Descriptions를 만들지 결정
export function resolveTheme(raw: string | undefined): WorldTheme {
  return raw === 'space' ? 'space' : 'folk';
}

// 런타임 단일 기준(⚠️ Codex 3차 리뷰 #2): 이미 영속된 worldMap.tileSetUrl로 테마 판별.
// 서버(createAgent 핸들러)·클라이언트(AgentCreator)·world.ts join이 모두 이걸 써서 일관성 보장.
export function themeFromTileSetUrl(url: string): WorldTheme {
  return url.includes('space-tiles') ? 'space' : 'folk';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- theme.test`
Expected: PASS (5 tests — resolveTheme 3 + themeFromTileSetUrl 2).

- [ ] **Step 5: 우주 캐릭터 정의 작성**

Create `data/spaceCharacters.ts` (folk 구조를 그대로 따름, `s1..s8` import):

```typescript
// ⚠️ placeholder: Task 0가 실제 s1~s6 스프라이트 + space-folk.png로 교체.
// 의존성 순서(Task 0 마지막) 때문에 일단 기존 folk 데이터·PNG를 placeholder 아트로 사용.
// 캐릭터 이름은 's1'~'s6' 유지(spaceDescriptions·화이트리스트·피커가 이 이름에 의존).
import { data as s1 } from './spritesheets/f1';
import { data as s2 } from './spritesheets/f2';
import { data as s3 } from './spritesheets/f3';
import { data as s4 } from './spritesheets/f4';
import { data as s5 } from './spritesheets/f5';
import { data as s6 } from './spritesheets/f6';

export const spaceDescriptions = [
  { name: 'Nova', character: 's1', identity: `Nova is a curious station botanist who loves rare alien plants and talks to them.`, plan: 'You want to catalogue every plant on the station.' },
  { name: 'Orion', character: 's2', identity: `Orion is a gruff veteran pilot who has seen too many close calls. Short answers, dry humor.`, plan: 'You want to keep everyone safe.' },
  { name: 'Vega', character: 's3', identity: `Vega is an over-caffeinated systems engineer who explains everything with metaphors.`, plan: 'You want to optimize the station.' },
  { name: 'Lyra', character: 's4', identity: `Lyra is a dreamy navigator who is obsessed with distant galaxies and old star maps.`, plan: 'You want to chart a new route home.' },
  { name: 'Atlas', character: 's5', identity: `Atlas is a stoic cargo chief who secretly writes poetry about the void.`, plan: 'You want quiet and order.' },
  { name: 'Iris', character: 's6', identity: `Iris is a chatty comms officer who knows all the station gossip.`, plan: 'You want to hear everything first.' },
];

// placeholder textureUrl = 기존 folk PNG. Task 0가 '/ai-town/assets/space-folk.png'로 교체.
export const spaceCharacters = [
  { name: 's1', textureUrl: '/ai-town/assets/32x32folk.png', spritesheetData: s1, speed: 0.1 },
  { name: 's2', textureUrl: '/ai-town/assets/32x32folk.png', spritesheetData: s2, speed: 0.1 },
  { name: 's3', textureUrl: '/ai-town/assets/32x32folk.png', spritesheetData: s3, speed: 0.1 },
  { name: 's4', textureUrl: '/ai-town/assets/32x32folk.png', spritesheetData: s4, speed: 0.1 },
  { name: 's5', textureUrl: '/ai-town/assets/32x32folk.png', spritesheetData: s5, speed: 0.1 },
  { name: 's6', textureUrl: '/ai-town/assets/32x32folk.png', spritesheetData: s6, speed: 0.1 },
];
```

(주의: `textureUrl`의 `/ai-town/assets/` 접두사는 기존 folk와 동일 규약 — `data/characters.ts`의 기존 `textureUrl` 값을 그대로 따를 것.)

- [ ] **Step 6: characters.ts에서 registry 병합 (⚠️ Codex 리뷰 #2)**

`Player.join`(player.ts:212), `Player.tsx:36`, 커스텀 검증이 모두 단일 `characters` 배열만 참조하므로, **우주 캐릭터를 `characters`에 병합**해야 렌더·검증이 된다.

Modify `data/characters.ts`:
1. 기존 `export const characters = [ ...f1~f8... ]` 선언을 **`export const folkCharacters = [ ...f1~f8... ]`** 로 이름만 변경.
2. 파일 맨 끝에 추가:

```typescript
import { spaceDescriptions, spaceCharacters } from './spaceCharacters';
export { spaceDescriptions, spaceCharacters };
export const folkDescriptions = Descriptions;
// 병합 registry — Player.join/Player.tsx가 folk+space 모두 "렌더"할 수 있게
export const characters = [...folkCharacters, ...spaceCharacters];

// ⚠️ Codex 2차 리뷰 #4: 렌더 registry는 병합하되, "생성 가능" 목록은 테마별로 분리.
export function creatableCharacters(theme: 'folk' | 'space') {
  return theme === 'space' ? spaceCharacters : folkCharacters;
}
```

(`Descriptions`는 folk 기본 유지 — init 테마 분기에서 선택. `characters`(병합)는 *렌더링*용, `creatableCharacters(theme)`는 *생성 화이트리스트/무작위 선택*용으로 구분.)

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

- [ ] **Step 3: init.ts 테마 분기 구현 (⚠️ Codex 2차 리뷰 #1)**

문제: `createAgent`의 index 경로는 `agentInputs.ts:8`이 import한 **folk `Descriptions`** 로 해석된다. 따라서 우주 모드에서 `descriptionIndex`를 보내면 **folk 에이전트가 생성**된다. 우주 모드는 반드시 **custom 경로**로 실제 space description을 보내야 한다.

Modify `convex/init.ts`:

1. 상단 import 교체:

```typescript
import { resolveTheme } from './util/theme';
import * as gentleMap from '../data/gentle';
import * as spaceMap from '../data/space';
import { folkDescriptions, spaceDescriptions } from '../data/characters';

const theme = resolveTheme(process.env.WORLD_THEME);
const map = theme === 'space' ? spaceMap : gentleMap;
const Descriptions = theme === 'space' ? spaceDescriptions : folkDescriptions;
```

(기존 `import { Descriptions } from '../data/characters'`와 `import * as map from '../data/gentle'` 라인을 대체. `map.*` 사용처는 변수명이 같아 변경 불필요.)

2. createAgent 루프(31-36행)를 테마별 분기로 교체:

```typescript
      const toCreate = args.numAgents !== undefined ? args.numAgents : Descriptions.length;
      for (let i = 0; i < toCreate; i++) {
        const createArgs =
          theme === 'space'
            ? { custom: spaceDescriptions[i % spaceDescriptions.length] }
            : { descriptionIndex: i % folkDescriptions.length };
        await insertInput(ctx, worldStatus.worldId, 'createAgent', createArgs);
      }
```

(space: custom 경로로 실제 description 전달 → 우주 에이전트 생성. folk: 기존 index 경로 유지.)

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

### Task 3: 검은 우주 + 별 배경 (필수 — ⚠️ Codex 3차 리뷰 #4)

설계 §4 IN #1이 "검은 우주 + 별 배경"을 **필수**로 규정하므로, 별 배경은 선택이 아니라 필수로 구현하고 파일도 확정한다.

**Files:**
- Modify: `src/components/Game.tsx` (Stage 래퍼 div에 별 배경 CSS + Stage 투명 배경)

**Interfaces:**
- Consumes: 기존 PixiJS Stage.
- Produces: 캔버스 뒤에 깔리는 검은 우주 + 별 배경(CSS, 게임 로직 무관). 맵 주변 여백에 별이 보임.

- [ ] **Step 1: 현재 Stage 설정 확인**

`src/components/Game.tsx`의 `<Stage>`와 이를 감싸는 div를 확인. Stage의 `options`(backgroundColor/backgroundAlpha) 위치를 찾는다.

- [ ] **Step 2: Stage 배경 투명 + 래퍼에 별 CSS**

`<Stage options={{ backgroundAlpha: 0 }} ...>` 로 캔버스 배경을 투명화하고, Stage를 감싸는 div에 검은 우주 + 별 배경 CSS를 적용:

```tsx
<div
  style={{
    background:
      'radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent),' +
      'radial-gradient(1.5px 1.5px at 70% 60%, #cfe6ff, transparent),' +
      'radial-gradient(1.5px 1.5px at 45% 80%, #fff, transparent),' +
      'radial-gradient(1.5px 1.5px at 85% 25%, #9bd, transparent),' +
      '#05060f',
  }}
>
  {/* 기존 <Stage> ... */}
</div>
```

(별은 CSS radial-gradient로 그려 에셋 의존 없음. 맵 캔버스가 투명이라 여백에 별이 보인다.)

- [ ] **Step 3: 검증 — 시각 확인**

Run: `npm run dev` → 검은 우주 + 별이 보이고 맵 렌더가 깨지지 않음(스크린샷 저장).
Expected: 별이 있는 검은 우주 배경 위에 정거장 타일맵.

- [ ] **Step 4: Commit**

```bash
git add src/components/Game.tsx
git commit -m "feat: required starfield space background behind the stage"
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
  - `convex/constants.ts` → `export const MAX_AGENTS = 8; export const AGENT_NAME_MAX = 32; export const AGENT_IDENTITY_MAX = 1000; export const AGENT_PLAN_MAX = 500;`
  - `convex/aiTown/createAgentValidation.ts` → `CustomAgentArgs`, `validateCustomAgent(args, ctx): void`(위반 시 throw), `normalizeCustomAgent(args): CustomAgentArgs`(trim), `CreateAgentArgs { descriptionIndex?: number; custom?: CustomAgentArgs }`, `resolveAgentSpec(args: CreateAgentArgs, ctx: { descriptions: CustomAgentArgs[]; existingNames: string[]; agentCount: number; validCharacters: string[] }): CustomAgentArgs`(XOR+index검사+custom검증·정규화 → 저장 spec).

- [ ] **Step 1: 상수 추가**

Modify `convex/constants.ts` — 파일 끝에 추가:

```typescript
export const MAX_AGENTS = 8; // 설계 의도(5~8명)에 맞춤 (⚠️ Codex 3차 리뷰 #7)
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
    expect(() => validateCustomAgent(base, { ...ctx, agentCount: 8 })).toThrow(/max/i);
  });
  test('rejects too-long identity', () => {
    expect(() => validateCustomAgent({ ...base, identity: 'x'.repeat(1001) }, ctx)).toThrow(/identity/i);
  });
  test('rejects whitespace-only identity', () => {
    expect(() => validateCustomAgent({ ...base, identity: '   ' }, ctx)).toThrow(/identity/i);
  });
});

import { normalizeCustomAgent, resolveAgentSpec } from './createAgentValidation';

describe('normalizeCustomAgent', () => {
  test('trims name, identity, plan', () => {
    const out = normalizeCustomAgent({ name: '  Zoe  ', character: 's1', identity: '  curious  ', plan: '  go  ' });
    expect(out).toEqual({ name: 'Zoe', character: 's1', identity: 'curious', plan: 'go' });
  });
});

describe('resolveAgentSpec', () => {
  const rctx = {
    descriptions: [{ name: 'Nova', character: 's1', identity: 'curious', plan: 'explore' }],
    existingNames: [] as string[],
    agentCount: 0,
    validCharacters: ['s1', 's2'],
  };
  test('rejects when both index and custom present', () => {
    expect(() => resolveAgentSpec({ descriptionIndex: 0, custom: base }, rctx)).toThrow(/exactly one/i);
  });
  test('rejects when neither present', () => {
    expect(() => resolveAgentSpec({}, rctx)).toThrow(/exactly one/i);
  });
  test('rejects out-of-range index', () => {
    expect(() => resolveAgentSpec({ descriptionIndex: 5 }, rctx)).toThrow(/descriptionIndex/i);
  });
  test('rejects non-integer index', () => {
    expect(() => resolveAgentSpec({ descriptionIndex: 1.5 }, rctx)).toThrow(/descriptionIndex/i);
  });
  test('resolves valid index to description', () => {
    expect(resolveAgentSpec({ descriptionIndex: 0 }, rctx)).toEqual(rctx.descriptions[0]);
  });
  test('resolves and normalizes valid custom', () => {
    expect(resolveAgentSpec({ custom: { ...base, name: '  Zoe  ' } }, rctx)).toEqual({ ...base, name: 'Zoe' });
  });
  test('custom path enforces validation (unknown character)', () => {
    expect(() => resolveAgentSpec({ custom: { ...base, character: 'zzz' } }, rctx)).toThrow(/character/i);
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
  const identity = args.identity?.trim() ?? '';
  if (identity.length < 1 || identity.length > AGENT_IDENTITY_MAX) {
    throw new Error(`Agent identity must be 1-${AGENT_IDENTITY_MAX} characters.`);
  }
  if ((args.plan?.length ?? 0) > AGENT_PLAN_MAX) {
    throw new Error(`Agent plan must be at most ${AGENT_PLAN_MAX} characters.`);
  }
  if (ctx.agentCount >= MAX_AGENTS) {
    throw new Error(`Max agents (${MAX_AGENTS}) reached.`);
  }
}

// 저장 전 정규화: 핸들러는 이 함수로 trim된 값을 얻어 저장한다.
export function normalizeCustomAgent(args: CustomAgentArgs): CustomAgentArgs {
  return {
    name: args.name.trim(),
    character: args.character,
    identity: args.identity.trim(),
    plan: (args.plan ?? '').trim(),
  };
}

// 핸들러의 결정 로직 전체를 순수 함수로 추출(⚠️ Codex 3차 리뷰 #5 — 자동 테스트 가능).
// XOR 강제 + index 범위/정수 검사 + custom 정규화·검증 → 저장할 spec 반환.
export interface CreateAgentArgs {
  descriptionIndex?: number;
  custom?: CustomAgentArgs;
}
export function resolveAgentSpec(
  args: CreateAgentArgs,
  ctx: {
    descriptions: CustomAgentArgs[];
    existingNames: string[];
    agentCount: number;
    validCharacters: string[];
  },
): CustomAgentArgs {
  const hasIndex = args.descriptionIndex !== undefined;
  const hasCustom = args.custom !== undefined;
  if (hasIndex === hasCustom) {
    throw new Error('createAgent requires exactly one of descriptionIndex or custom');
  }
  if (hasCustom) {
    const normalized = normalizeCustomAgent(args.custom!);
    validateCustomAgent(normalized, {
      existingNames: ctx.existingNames,
      agentCount: ctx.agentCount,
      validCharacters: ctx.validCharacters,
    });
    return normalized;
  }
  const idx = args.descriptionIndex!;
  if (!Number.isInteger(idx) || idx < 0 || idx >= ctx.descriptions.length) {
    throw new Error(`Invalid descriptionIndex: ${idx}`);
  }
  const d = ctx.descriptions[idx];
  return { name: d.name, character: d.character, identity: d.identity, plan: d.plan };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- createAgentValidation`
Expected: PASS (16 tests — validateCustomAgent 8 + normalizeCustomAgent 1 + resolveAgentSpec 7).

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
- Consumes: `resolveAgentSpec` (Task 4); `creatableCharacters` + `themeFromTileSetUrl` (Task 1); `Player.join` (기존).
- Produces: 확장된 `createAgent` 인풋 — `args: { descriptionIndex?: number, custom?: {name, character, identity, plan} }`. **정확히 하나만** 허용(XOR). 반환은 기존과 동일 `{ agentId }`.

> **idempotency 범위 정정(⚠️ Codex 리뷰 #6)**: 설계의 "생성 중복/연타 방지"는 v1에서 **진짜 idempotency(requestId 기반)가 아니다.** v1 실제 범위 = **서버측 중복 이름 거부 + 클라이언트 `busy` 연타 가드**로 한정한다. requestId 기반 idempotency는 후속(멀티유저 조각 E와 함께)으로 미룸.

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
      // 결정 로직은 순수 함수로 추출되어 단위 테스트됨(Task 4). 핸들러는 mutation만 수행.
      const { name, character, identity, plan } = resolveAgentSpec(args, {
        descriptions: Descriptions,
        existingNames: [...game.playerDescriptions.values()].map((d) => d.name),
        agentCount: game.world.agents.size,
        // ⚠️ Codex #4/#2: 화이트리스트는 병합 registry가 아니라, 영속된 worldMap.tileSetUrl 기준 테마의 생성 가능 목록
        validCharacters: creatableCharacters(themeFromTileSetUrl(game.worldMap.tileSetUrl)).map((c) => c.name),
      });
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
import { creatableCharacters } from '../../data/characters';
import { themeFromTileSetUrl } from '../util/theme';
import { resolveAgentSpec } from './createAgentValidation';
```

(`Descriptions`는 이미 import되어 있음 — index 경로 유지용. 커스텀 character 화이트리스트는 `themeFromTileSetUrl(game.worldMap.tileSetUrl)` 기준이라 영속 상태와 일관되게 테마 경계를 지킨다.)

- [ ] **Step 4: world.ts 휴먼 join 캐릭터도 테마별로 (⚠️ Codex 2차 리뷰 #4)**

`convex/world.ts:134`의 `character: characters[Math.floor(Math.random() * characters.length)].name`이 병합 배열을 쓰므로 우주 모드에 folk 아바타가 섞인다. **영속된 맵의 tileSetUrl**로 테마를 판별해 교체(단일 기준 일관성):

```typescript
import { creatableCharacters } from '../data/characters';
import { themeFromTileSetUrl } from './util/theme';
// ... joinWorld 핸들러 안, world 조회 직후:
const worldMap = await ctx.db
  .query('maps')
  .withIndex('worldId', (q) => q.eq('worldId', world._id))
  .unique();
const creatable = creatableCharacters(
  worldMap ? themeFromTileSetUrl(worldMap.tileSetUrl) : 'folk',
);
// join 인풋:
character: creatable[Math.floor(Math.random() * creatable.length)].name,
```

(`maps` 테이블은 `worldId` 인덱스 보유 — 확인됨. 기존 `import { characters }`가 다른 곳에 쓰이면 유지.)

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (init.ts의 기존 `createAgent({descriptionIndex})` 호출이 여전히 유효.)

- [ ] **Step 6: index 경로 무손상 확인 (folk 모드)**

Run: `npx convex run testing:wipeAllTables` 후 (WORLD_THEME 미설정) `npm run dev`로 init 동작 확인 → folk 기본 에이전트가 정상 생성됨.
Expected: 기존과 동일하게 에이전트 생성.

- [ ] **Step 7: custom 경로 수동 테스트**

브라우저 콘솔이나 `npx convex run`으로 custom 인풋을 보내 에이전트 1명 생성(엔진 인풋 경로). 또는 Phase 5 UI 완성 후 통합 검증으로 미룬다. 최소: 잘못된 character/빈 이름이 서버에서 거부되는지 확인.
Expected: 유효 입력은 에이전트 생성, 위반 입력은 에러.

- [ ] **Step 8: Commit**

```bash
git add convex/aiTown/agentInputs.ts convex/world.ts
git commit -m "feat: support custom agent creation with theme-scoped character whitelist"
```

---

## Phase 4 — LLM 설정 (OpenRouter)

### Task 6: OpenRouter 임베딩 차원 검증 조정

**Files:**
- Modify: `convex/util/llm.ts:7-35` (EMBEDDING_DIMENSION + 검증 switch)

**Interfaces:**
- Produces: 선택한 OpenRouter 임베딩 모델의 출력 차원에 맞춘 `EMBEDDING_DIMENSION`과, custom provider에서 그 차원을 허용하는 검증.

- [ ] **Step 1: 임베딩 모델·차원 확정 (⚠️ Codex 리뷰 #4 — 미정 금지)**

OpenRouter 임베딩 모델을 **확정**한다: `openai/text-embedding-3-small`, **출력 차원 1536**. 채팅 모델도 확정(테스트용 무료 모델, 예: `meta-llama/llama-3.3-70b-instruct:free` — OpenRouter 모델 페이지에서 현재 사용 가능한 `:free` 모델로 최종 확인).

- [ ] **Step 2: detectMismatchedLLMProvider가 custom을 먼저 판별하도록 수정 (⚠️ Codex 2차 리뷰 #3)**

문제: `EMBEDDING_DIMENSION=1536`이면 `detectMismatchedLLMProvider()`가 `case OPENAI_EMBEDDING_DIMENSION`에 걸려 **무조건 `OPENAI_API_KEY`를 요구**한다(`LLM_PROVIDER=custom`/`LLM_API_KEY` 미확인). 그래서 OpenRouter 설정으로 `init.ts:17` 호출 시 throw. **custom provider를 dimension switch보다 먼저 판별**해야 한다.

`convex/util/llm.ts` 상단 `EMBEDDING_DIMENSION = 1536` 유지. `detectMismatchedLLMProvider` 함수 시작부에 custom 우선 분기 추가:

```typescript
export function detectMismatchedLLMProvider() {
  // custom provider(OpenRouter 등) 판별 조건은 getLLMConfig와 동일하게 LLM_API_URL 존재 여부.
  // (getLLMConfig는 line 75 `if (process.env.LLM_API_URL)`로 custom을 선택하므로 여기서도 같은 키를 써야 일관됨.)
  if (process.env.LLM_API_URL) {
    if (!process.env.LLM_API_KEY) {
      throw new Error("Set LLM_API_KEY: npx convex env set LLM_API_KEY 'your-openrouter-key'");
    }
    return;
  }
  switch (EMBEDDING_DIMENSION) {
    // ...기존 분기 그대로...
```

(기존 switch 본문은 유지하고, 위 custom 분기만 함수 맨 앞에 삽입. 조건이 `LLM_API_URL` 기준이라 `getLLMConfig`의 custom 선택 로직과 정확히 일치한다.)

- [ ] **Step 3: base URL 수정 (⚠️ Codex 리뷰 #1 — 치명적)**

`convex/util/llm.ts`는 `config.url`에 `/v1/chat/completions`(150행)와 `/v1/embeddings`(220행)를 **덧붙인다.** 따라서 base URL에 `/v1`을 넣으면 `/api/v1/v1/...`로 깨진다. **올바른 값은 `https://openrouter.ai/api`** (코드가 `/v1/...`을 붙여 `https://openrouter.ai/api/v1/chat/completions`가 됨).

- [ ] **Step 4: Convex 환경변수 설정 (⚠️ Codex 리뷰 #4 — 클라우드는 env set 필수)**

클라우드 Convex action은 `.env.local`을 못 읽는다. **모든 LLM_* 변수를 `npx convex env set`으로** 설정:

```bash
npx convex env set LLM_PROVIDER custom
npx convex env set LLM_API_URL https://openrouter.ai/api
npx convex env set LLM_MODEL meta-llama/llama-3.3-70b-instruct:free
npx convex env set LLM_EMBEDDING_MODEL openai/text-embedding-3-small
npx convex env set LLM_API_KEY <openrouter-key>   # 키는 저장소에 넣지 않음
```

README의 LLM 설정 섹션에도 이 OpenRouter 조합을 문서화(키 값 제외).

- [ ] **Step 5: 타입체크 + 임베딩/채팅 동작 확인**

Run: `npx tsc --noEmit` 그리고 `npm run dev` 후 에이전트 대화 + 메모리 임베딩 호출이 Convex 로그에서 200으로 도는지 확인(404/더블슬래시 없음).
Expected: 차원 불일치·URL 에러 없음, 채팅·임베딩 성공.

- [ ] **Step 6: Commit**

```bash
git add convex/util/llm.ts README.md
git commit -m "chore: configure OpenRouter chat+embedding via custom provider"
```

---

## Phase 5 — 생성 UI

### Task 7: AgentCreator 모달 + 우측 패널 버튼

**Files:**
- Create: `src/components/AgentCreator.tsx`
- Modify: `src/components/Game.tsx:68-82`

**Interfaces:**
- Consumes: `useSendInput(engineId, 'createAgent')` (확장된 custom 인자, Task 5); `creatableCharacters` + `themeFromTileSetUrl` (Task 1); `game: ServerGame`(테마 판별용 `game.worldMap.tileSetUrl`).
- Produces: `src/components/AgentCreator.tsx` → `export function AgentCreator({ engineId, game }: { engineId: Id<'engines'>; game: ServerGame })` — 버튼 + 모달. 모달 폼: **실제 스프라이트 미리보기** 아바타 그리드(테마별 `pickable`), name, identity, plan. 제출 시 `createAgent({ custom: {...} })`. 서버 화이트리스트와 동일 기준이라 folk/space 모드 모두 정상.

- [ ] **Step 1: 스프라이트시트 프레임 좌표 형식 확인 (⚠️ Codex 리뷰 #3)**

`data/spritesheets/types.ts`와 `f1.ts`를 열어 `spritesheetData.frames`의 각 항목 형식(`{ frame: { x, y, w, h } }` 표준 형태인지)을 확인한다. `AvatarPreview`가 이 좌표로 background-position 크롭을 한다.

- [ ] **Step 2: AvatarPreview + AgentCreator 컴포넌트 작성**

실제 이미지를 보여주는 비주얼 피커가 핵심 감성 요소이므로 v1 필수.

Create `src/components/AgentCreator.tsx`:

```typescript
import { useState } from 'react';
import { Id } from '../../convex/_generated/dataModel';
import { useSendInput } from '../hooks/sendInput';
import { characters, creatableCharacters } from '../../data/characters';
import { themeFromTileSetUrl } from '../../convex/util/theme';
import { ServerGame } from '../hooks/serverGame';

// 첫 프레임을 잘라 보여주는 실제 아바타 미리보기.
// ⚠️ Codex 2차 리뷰 #2: SpritesheetData.meta에는 size가 없고 scale만 있다.
// 따라서 backgroundSize 계산 대신, 네이티브 프레임을 overflow로 자르고 transform으로 확대한다.
// 병합 registry(characters)에서 찾으므로 folk/space 어느 캐릭터든 미리보기 가능.
function AvatarPreview({ characterName, scale = 2 }: { characterName: string; scale?: number }) {
  const c = characters.find((sc) => sc.name === characterName);
  if (!c) return null;
  const frames = (c.spritesheetData as any).frames as Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  const first = Object.values(frames)[0]?.frame;
  if (!first) return null;
  return (
    <div style={{ width: first.w * scale, height: first.h * scale, overflow: 'hidden' }}>
      <div
        style={{
          width: first.w,
          height: first.h,
          backgroundImage: `url(${c.textureUrl})`,
          backgroundPosition: `-${first.x}px -${first.y}px`,
          backgroundRepeat: 'no-repeat',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

export function AgentCreator({ engineId, game }: { engineId: Id<'engines'>; game: ServerGame }) {
  // ⚠️ Codex 3차 리뷰 #2: 피커 캐릭터 세트는 서버 화이트리스트와 동일 기준(worldMap.tileSetUrl)에서 도출
  const pickable = creatableCharacters(themeFromTileSetUrl(game.worldMap.tileSetUrl));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [character, setCharacter] = useState(pickable[0]?.name ?? '');
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
              {pickable.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setCharacter(c.name)}
                  className={`border-2 p-1 flex items-center justify-center ${character === c.name ? 'border-yellow-400' : 'border-transparent'}`}
                >
                  <AvatarPreview characterName={c.name} />
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

(주: 아바타 그리드는 `AvatarPreview`로 실제 스프라이트를 보여준다 — 이것이 핵심 감성 요소라 v1 필수.)

- [ ] **Step 3: Game.tsx 우측 패널에 삽입**

Modify `src/components/Game.tsx` — 우측 패널 `<PlayerDetails .../>` 바로 위에 추가:

```typescript
          <AgentCreator engineId={engineId} game={game} />
          <PlayerDetails
```

그리고 상단 import 추가:

```typescript
import { AgentCreator } from './AgentCreator';
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (`createAgent`의 custom 인자가 Task 5의 인풋 타입과 일치.)

- [ ] **Step 5: 검증 — UI로 생성**

Run: `npm run dev` → 우측 패널의 "에이전트 만들기" 클릭 → **아바타 미리보기 그리드**에서 선택 + 이름·성격·plan 입력 → 생성 → 월드에 에이전트 등장·이동·대화. 잘못된 입력(빈 이름/중복) 시 에러 메시지.
Expected: 아바타가 실제 스프라이트로 보이고, 정상 생성 및 서버 거부 동작.

- [ ] **Step 6: Commit**

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

- [ ] **Step 1: agentDescription 조회 (정확한 코드 — ⚠️ Codex 3차 리뷰 #3)**

`PlayerDetails.tsx`는 `game: ServerGame`을 받고 이미 `game.world.players`, `game.playerDescriptions.get(playerId)`를 쓴다(확인됨). 같은 패턴으로, `playerDescription` 계산 줄(`const playerDescription = playerId && game.playerDescriptions.get(playerId);`) **바로 아래**에 agentDescription 조회를 추가:

```typescript
const agent =
  playerId && [...game.world.agents.values()].find((a) => a.playerId === playerId);
const agentDescription = agent ? game.agentDescriptions.get(agent.id) : undefined;
```

- [ ] **Step 2: identity/plan 렌더 추가**

`{!isMe && playerDescription?.description}` 표시 근처에 다음을 추가(에이전트일 때만 표시):

```typescript
{agentDescription && (
  <>
    <div className="mt-2"><span className="uppercase text-xs">Identity</span><p>{agentDescription.identity}</p></div>
    <div className="mt-2"><span className="uppercase text-xs">Plan</span><p>{agentDescription.plan}</p></div>
  </>
)}
```

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

빈 이름 / 33자 초과 이름 / 중복 이름 / 비허용 character / 최대치(8) 초과 → 서버에서 거부됨.

- [ ] **Step 5: 영속성 확인**

페이지 새로고침 → 커스텀 에이전트 유지. 엔진 재시작(`npx convex run testing:stop` 후 재개) → 유지.

- [ ] **Step 6: folk 무손상 확인**

`npx convex env set WORLD_THEME folk` (또는 unset) → `npx convex run testing:wipeAllTables` → `npm run dev` → 기존 folk 타운 정상.

- [ ] **Step 7: wipe 초기화 검증**

`npx convex run testing:wipeAllTables` → init → 기본 에이전트로 정상 재초기화(커스텀은 사라짐 — 정상).

- [ ] **Step 8: 전체 게이트 통과 (⚠️ Codex 리뷰 #7)**

Run:
```bash
npm test
npm run lint
npm run build
```
Expected: 단위 테스트(기존 + theme, createAgentValidation) 모두 PASS, lint 무경고, build 성공.

- [ ] **Step 9: 시각 회귀 — Playwright 스크린샷 + 캔버스 비어있지 않음 확인**

시각 작업이므로 Playwright(MCP)로 **데스크톱·모바일 뷰포트** 스크린샷을 캡처하고:
- 우주 배경 + 타일맵 + 에이전트가 보이는지 육안 확인,
- **Pixi `<canvas>`가 비어있지 않은지** 검증(캔버스 픽셀이 전부 단색/투명이 아님). 예: 캔버스 toDataURL 길이/픽셀 분산 체크 또는 스크린샷 내 비배경 픽셀 존재 확인.
Expected: 두 뷰포트 모두 우주 월드가 렌더되고 캔버스가 비어있지 않음.

---

## Self-Review 메모

- **스펙 커버리지**: §4 IN 1(리스킨)=Task 0,2,3 / IN 2(아바타)=Task 0,1 / IN 3(생성 UI)=Task 5,7 / IN 4(영속성·스키마무변경)=Task 5 + 검증 Task 9-5 / IN 5(PlayerDetails)=Task 8 / IN 6(가드)=Task 4,5. §3 테마전환=Task 2. §6 LLM=Task 6. §8 검증=Task 9. §10 Phase 0=Task 0. 누락 없음.
- **iso/좌표 추상화**: 의도적으로 제외(Global Constraints).
- **타입 일관성**: `validateCustomAgent`/`CustomAgentArgs`(Task 4) ↔ createAgent custom 인자(Task 5) ↔ AgentCreator 제출(Task 7) 시그니처 일치.
