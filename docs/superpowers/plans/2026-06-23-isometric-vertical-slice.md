# 이소메트릭 수직 조각 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 생성형 비트맵으로 만든 10×10 우주정거장 방에서 사용자 1명과 AI 에이전트 1명이 기존 Convex pathfinding으로 이동하고 가구 앞뒤로 자연스럽게 가려지는 정상 게임 화면을 만든다.

**Architecture:** 게임 로직은 기존 world tile 좌표와 충돌 규칙을 유지하고, 화면에만 `Projection`을 적용한다. backend collision map과 frontend render manifest를 분리하며, 바닥은 고정 layer에 그리고 벽·가구·캐릭터는 발 접점 기준의 동일 sortable container에서 정렬한다. `VITE_VIEW_MODE=iso`와 `WORLD_THEME=iso-slice` 조합에서만 새 화면을 활성화하고 기존 top-down과 `#iso-debug`는 유지한다.

**Tech Stack:** TypeScript, React, PixiJS, @pixi/react, Convex, Jest, Sharp, AI image generation, Playwright browser verification

## Global Constraints

- 선행 계획 `2026-06-23-convex-persistence-stabilization.md`의 60분 게이트가 PASS여야 시작한다.
- 게임 로직 좌표, pathfinding, 대화 거리 계산은 top-down world 좌표를 유지한다.
- 정상 앱 화면에 실제 생성형 PNG를 렌더하며 debug grid와 원형 marker를 제품 화면에 사용하지 않는다.
- 10×10 단일 방, 사용자 1명, AI 1명만 구현한다.
- 캐릭터는 NE/NW/SE/SW 4방향, idle 1프레임, walk 4프레임만 구현한다.
- 에셋은 개별 PNG와 anchor manifest로 먼저 검증하고 atlas 최적화는 하지 않는다.
- `VITE_VIEW_MODE` 기본값은 `topdown`, `WORLD_THEME` 기본값은 기존 동작을 유지한다.
- 기존 top-down 화면과 `#iso-debug`를 삭제하지 않는다.
- 각 Task는 지정 테스트, 타입체크, 빌드 또는 브라우저 검증 후 독립 커밋한다.
- 기존 dirty 파일을 임의로 stage, 수정, 되돌리지 않는다.

## 파일 구조

- Create: `src/rendering/projection/Projection.ts`
- Create: `src/rendering/projection/topDownProjection.ts`
- Create: `src/rendering/projection/isoProjection.ts`
- Create: `src/rendering/projection/projection.test.ts`
- Create: `src/config/viewMode.ts`, `src/config/viewMode.test.ts`
- Create: `src/rendering/isWalkableTile.ts`, `src/rendering/isWalkableTile.test.ts`
- Create: `src/components/isometric/IsoMap.tsx`
- Create: `src/components/isometric/IsoMapObject.tsx`
- Create: `src/components/isometric/IsoCharacter.tsx`
- Create: `src/components/isometric/isoDepth.ts`, `src/components/isometric/isoDepth.test.ts`
- Create: `src/components/isometric/orientation.ts`, `src/components/isometric/orientation.test.ts`
- Create: `data/isoVerticalSlice.ts`
- Create: `data/isoVerticalSlice.test.ts`
- Create: `data/assets/isoSliceManifest.ts`
- Modify: `data/assets/CREDITS.md`
- Create: `scripts/buildIsoAssets.mjs`, `scripts/validateIsoAssets.mjs`
- Create: `public/assets/iso-slice/*.png`
- Modify: `convex/util/theme.ts`, `convex/util/theme.test.ts`, `convex/init.ts`
- Modify: `convex/aiTown/worldMap.ts`, `convex/aiTown/player.ts`
- Modify: `data/characters.ts`
- Modify: `src/components/PixiGame.tsx`, `src/components/Player.tsx`
- Modify: `package.json`, `README.md`
- Create: `.env.example`

---

### Task 1: Projection 계약과 view mode

**Files:**
- Create: `src/rendering/projection/Projection.ts`
- Create: `src/rendering/projection/topDownProjection.ts`
- Create: `src/rendering/projection/isoProjection.ts`
- Create: `src/rendering/projection/projection.test.ts`
- Create: `src/config/viewMode.ts`
- Create: `src/config/viewMode.test.ts`

**Interfaces:**
- Produces: `Projection`, `Point`, `IsoMetrics`
- Produces: `createTopDownProjection(tileDim)`
- Produces: `createIsoProjection({tileWidth, tileHeight, originX, originY})`
- Produces: `VIEW_MODE: 'topdown' | 'iso'`

- [ ] **Step 1: projection 실패 테스트를 작성한다**

```typescript
const iso = createIsoProjection({
  tileWidth: 64,
  tileHeight: 32,
  originX: 320,
  originY: 16,
});

expect(iso.worldToScreen({ x: 1, y: 0 })).toEqual({ x: 352, y: 32 });
expect(iso.worldToScreen({ x: 0, y: 1 })).toEqual({ x: 288, y: 32 });
expect(iso.screenToWorld(iso.worldToScreen({ x: 4, y: 7 }))).toEqual({ x: 4, y: 7 });
expect(iso.viewportSize(10, 10)).toEqual({ width: 640, height: 320 });
```

top-down 순방향·역방향과 fractional point round-trip도 `toBeCloseTo`로 검증한다.

- [ ] **Step 2: view mode 실패 테스트를 작성한다**

`parseViewMode(undefined)`와 invalid 값은 `topdown`, `parseViewMode('iso')`는 `iso`인지 검증한다.

- [ ] **Step 3: 실패를 확인한다**

Run: `npm test -- src/rendering/projection/projection.test.ts src/config/viewMode.test.ts --runInBand`

Expected: FAIL with missing modules.

- [ ] **Step 4: 계약과 구현을 작성한다**

`Projection.ts`:

```typescript
export type Point = { x: number; y: number };

export type Projection = {
  worldToScreen(position: Point): Point;
  worldToScreenCenter(position: Point): Point;
  screenToWorld(position: Point): Point;
  viewportSize(mapWidth: number, mapHeight: number): {
    width: number;
    height: number;
  };
};

export type IsoMetrics = {
  tileWidth: 64;
  tileHeight: 32;
  originX: number;
  originY: number;
};
```

iso 공식은 `x=(worldX-worldY)*32+originX`, `y=(worldX+worldY)*16+originY`를 사용한다. center는 tile center인 `y+16`을 반환한다.

- [ ] **Step 5: config를 구현한다**

```typescript
export type ViewMode = 'topdown' | 'iso';

export function parseViewMode(raw: string | undefined): ViewMode {
  return raw === 'iso' ? 'iso' : 'topdown';
}

export const VIEW_MODE = parseViewMode(import.meta.env.VITE_VIEW_MODE);
```

- [ ] **Step 6: 검증하고 커밋한다**

```bash
npm test -- src/rendering/projection/projection.test.ts src/config/viewMode.test.ts --runInBand
npx tsc --noEmit
git add src/rendering/projection src/config/viewMode.ts src/config/viewMode.test.ts
git commit -m "feat: add projection contract and view mode"
```

Expected: projection/config tests PASS, TypeScript 0 errors.

---

### Task 2: 10×10 backend map과 iso-slice theme

**Files:**
- Create: `data/isoVerticalSlice.ts`
- Create: `data/isoVerticalSlice.test.ts`
- Modify: `convex/util/theme.ts`
- Modify: `convex/util/theme.test.ts`
- Modify: `convex/init.ts`
- Modify: `convex/aiTown/worldMap.ts`
- Modify: `convex/aiTown/player.ts`
- Modify: `data/characters.ts`

**Interfaces:**
- Extends: `WorldTheme = 'folk' | 'space' | 'iso-slice'`
- Produces: `isoDescriptions` with one AI agent
- Produces: 10×10 `bgtiles`, `objmap`, `spawnPoints`
- Extends: `SerializedWorldMap.spawnPoints?: { human: Point; agents: Point[] }`

- [ ] **Step 1: theme와 map 실패 테스트를 작성한다**

```typescript
expect(resolveTheme('iso-slice')).toBe('iso-slice');
expect(mapwidth).toBe(10);
expect(mapheight).toBe(10);
expect(objmap[0][0][0]).not.toBe(-1);
expect(objmap[0][1][1]).toBe(-1);
expect(spawnPoints).toEqual({
  human: { x: 2, y: 7 },
  agent: { x: 7, y: 2 },
});
```

외곽 36칸과 가구 footprint `(4,4),(4,5),(5,4),(5,5),(7,6)`가 blocked이고 나머지 내부가 walkable인지 전부 순회한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- convex/util/theme.test.ts data/isoVerticalSlice.test.ts --runInBand`

Expected: FAIL because theme and map are missing.

- [ ] **Step 3: backend map을 작성한다**

`data/isoVerticalSlice.ts`는 다음 helper로 `[x][y]` 배열을 만든다.

```typescript
const layer = (fill: number) =>
  Array.from({ length: 10 }, () => Array<number>(10).fill(fill));

const collision = layer(-1);
for (let x = 0; x < 10; x++) {
  collision[x][0] = 0;
  collision[x][9] = 0;
}
for (let y = 0; y < 10; y++) {
  collision[0][y] = 0;
  collision[9][y] = 0;
}
for (const [x, y] of [[4, 4], [4, 5], [5, 4], [5, 5], [7, 6]]) {
  collision[x][y] = 0;
}
```

exports는 `tilesetpath='/ai-town/assets/iso-slice/floor-metal.png'`, `tilesetpxw=64`, `tilesetpxh=32`, `tiledim=32`, `bgtiles=[layer(0)]`, `objmap=[collision]`, `animatedsprites=[]`로 고정한다.

- [ ] **Step 4: init을 theme에 연결한다**

`WORLD_THEME=iso-slice`일 때 새 map과 `isoDescriptions`를 선택하며 기본 agent 수를 1로 한다. description은 다음 값으로 고정한다.

```typescript
{
  name: 'Nova',
  character: 'iso-agent',
  identity: 'Nova is a calm station systems analyst who explains observations precisely.',
  plan: 'Inspect the station and speak with its visitor.',
}
```

`characters` validation을 통과하도록 `iso-agent`를 등록하되 top-down용 texture metadata는 기존 `f1` 정의를 재사용한다. 실제 iso 화면은 Task 5 manifest를 사용한다.

`serializedWorldMap`에 optional `spawnPoints`를 추가하고 serialize/constructor를 함께 갱신한다. `Player.join`은 iso map에서 첫 AI를 `agents[0]`, 첫 human을 `human` 위치에 둔다. 점유되었거나 spawn 설정이 없는 기존 map은 현재 random free-position 탐색으로 fallback한다. `creatableCharacters`와 `themeFromTileSetUrl`도 `iso-slice`를 처리한다.

- [ ] **Step 5: 검증하고 커밋한다**

```bash
npm test -- convex/util/theme.test.ts data/isoVerticalSlice.test.ts --runInBand
npx tsc --noEmit
git add data/isoVerticalSlice.ts data/isoVerticalSlice.test.ts convex/util/theme.ts convex/util/theme.test.ts convex/init.ts convex/aiTown/worldMap.ts convex/aiTown/player.ts data/characters.ts
git commit -m "feat: add ten by ten isometric slice world"
```

Expected: theme/map tests PASS, TypeScript 0 errors.

---

### Task 3: 생성형 비트맵 에셋과 검증 파이프라인

**Files:**
- Create: `scripts/buildIsoAssets.mjs`
- Create: `scripts/validateIsoAssets.mjs`
- Create: `data/assets/isoSliceManifest.ts`
- Create: `data/assets/isoSliceManifest.test.ts`
- Modify: `data/assets/CREDITS.md`
- Create: `public/assets/iso-slice/*.png`
- Modify: `package.json`

**Interfaces:**
- Produces: 64×32 floor PNG 3개
- Produces: wall/door/console/desk/chair transparent PNG
- Produces: `human|agent × NE|NW|SE|SW × idle|walk-0..3` 40 character frames, each 128×128
- Produces: `ISO_ASSETS`, `ISO_CHARACTER_FRAMES`

- [ ] **Step 1: processing 의존성과 scripts를 추가한다**

```bash
npm install --save-dev sharp@latest
```

`package.json`:

```json
"assets:iso:build": "node scripts/buildIsoAssets.mjs",
"assets:iso:validate": "node scripts/validateIsoAssets.mjs"
```

- [ ] **Step 2: image generation으로 다섯 source sheet를 만든다**

반드시 image generation 도구를 사용해 아래 다섯 프롬프트를 각각 실행하고 source PNG를 `/tmp/orbit-iso-source`에 둔다.

1. `floors.png`: “Strict 3-column sprite asset sheet, isolated 2:1 isometric diamond floor tiles: brushed metal, inset technical panel, yellow-black hazard marking; orthographic 2.5D game asset, crisp readable shapes, neutral cool-gray sci-fi palette, transparent background, no text, no shadows outside each tile.”
2. `architecture.png`: “Strict 4-column sprite asset sheet: northwest station wall, northeast station wall, matching inner corner, open sci-fi doorway; orthographic 2:1 isometric game assets, modular low-poly painted bitmap style, transparent background, no floor, no text.”
3. `props.png`: “Strict 3-column sprite asset sheet: compact workstation console, rectangular station desk, single swivel chair; orthographic 2:1 isometric game assets, same cool-gray and cyan-accent style, transparent background, no floor, no text.”
4. `human.png`: “Strict grid with 4 columns NE NW SE SW and 5 rows idle walk1 walk2 walk3 walk4; one compact white-and-blue astronaut, full body, orthographic isometric game sprite, identical proportions and foot contact in every cell, transparent background, no labels, no cast shadow.”
5. `agent.png`: “Strict grid with 4 columns NE NW SE SW and 5 rows idle walk1 walk2 walk3 walk4; one compact charcoal-and-cyan android astronaut, full body, orthographic isometric game sprite, identical proportions and foot contact in every cell, transparent background, no labels, no cast shadow.”

각 sheet는 격자 누락, 방향 중복, 잘린 실루엣이 없어야 한다. 최대 3회 생성해도 조건을 만족하지 못하면 해당 Task를 중단하고 source sheet 스크린샷과 실패 이유를 보고한다.

- [ ] **Step 3: deterministic build script를 작성한다**

`buildIsoAssets.mjs`는 source sheet를 동일 폭 columns/rows로 자르고 `sharp(...).resize({fit:'contain'})`으로 다음 규격을 출력한다.

- floor: 64×32
- wall/door/props: 투명 192×192 canvas
- character: 투명 128×128 canvas

character 파일명은 `human-ne-idle.png`, `human-ne-walk-0.png` 형식을 사용한다. 모든 프레임은 아래 중앙 `{x:64,y:116}`에 발 접점이 오도록 composite offset을 적용한다.

- [ ] **Step 4: manifest와 validator를 작성한다**

`isoSliceManifest.ts`:

```typescript
export type IsoAsset = {
  src: string;
  displaySize: { width: number; height: number };
  anchor: { x: number; y: number };
};

export const CHARACTER_FOOT_ANCHOR = { x: 0.5, y: 116 / 128 };
```

`validateIsoAssets.mjs`는 `sharp.metadata()`로 파일 존재, 정확한 width/height, alpha channel을 검사한다. 테스트는 manifest의 모든 경로가 중복 없이 50개 필수 파일(바닥 3 + 구조물 4 + 소품 3 + 캐릭터 40)을 가리키고 anchor가 0..1 범위인지 검증한다.

- [ ] **Step 5: CREDITS를 작성한다**

기존 credit 내용을 보존하고 새 `Isometric vertical slice` 절을 추가한다. 각 sheet의 생성일 2026-06-23, 사용 도구, 위 prompt 전문, 파생 파일 목록, “temporary prototype assets; replace before commercial release” 문구를 기록한다.

- [ ] **Step 6: 시각 및 자동 검증 후 커밋한다**

```bash
npm run assets:iso:build
npm run assets:iso:validate
npm test -- data/assets/isoSliceManifest.test.ts --runInBand
npx tsc --noEmit
```

Expected: 50 required files validated, manifest test PASS, TypeScript 0 errors.

`view_image`로 floor 3개, architecture sheet 파생 4개, prop 3개, 두 캐릭터의 20-frame contact sheet를 확인한다. 발 접점 오차가 2px를 넘거나 투명 여백 때문에 실루엣이 48px보다 작으면 build offset/scale을 수정하고 다시 검증한다.

```bash
git add package.json package-lock.json scripts/buildIsoAssets.mjs scripts/validateIsoAssets.mjs data/assets/isoSliceManifest.ts data/assets/isoSliceManifest.test.ts data/assets/CREDITS.md public/assets/iso-slice
git commit -m "feat: add generated isometric prototype assets"
```

---

### Task 4: Iso map object와 stable depth sorting

**Files:**
- Create: `src/components/isometric/isoDepth.ts`
- Create: `src/components/isometric/isoDepth.test.ts`
- Create: `src/components/isometric/IsoMapObject.tsx`
- Create: `src/components/isometric/IsoMap.tsx`
- Modify: `data/isoVerticalSlice.ts`

**Interfaces:**
- Produces: `IsoMapObject` manifest type
- Produces: `isoDepthKey(tile, layer, depthOffset): number`
- Produces: `IsoMap` floor renderer and `IsoMapObject` depth sprite

- [ ] **Step 1: depth 실패 테스트를 작성한다**

같은 tile에서 floor < wall < object < foreground 순서, `x+y`가 큰 객체가 앞, 같은 대각선에서 y가 큰 객체가 앞, 동일 입력은 동일 key인지 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/components/isometric/isoDepth.test.ts --runInBand`

Expected: FAIL with missing module.

- [ ] **Step 3: depth 함수를 구현한다**

```typescript
const LAYER_ORDER = { floor: 0, wall: 100, object: 200, foreground: 300 };

export function isoDepthKey(
  tile: Point,
  layer: keyof typeof LAYER_ORDER,
  depthOffset: number,
): number {
  return Math.floor((tile.x + tile.y) * 1000)
    + Math.floor(tile.y * 10)
    + LAYER_ORDER[layer]
    + depthOffset;
}
```

- [ ] **Step 4: render manifest를 고정한다**

10×10 바닥 100개와 NW/NE 외곽 벽, 북쪽 출입구, 중앙 2×2 desk, `(7,6)` console, chair를 manifest에 넣는다. object의 `tile`은 발/바닥 접점, `footprint`는 Task 2 collision과 일치해야 한다.

- [ ] **Step 5: Pixi 컴포넌트를 구현한다**

`IsoMap`은 floor container만 렌더한다. `IsoMapObject`는 projection 결과, normalized anchor, display size, `zIndex=isoDepthKey(...)`를 적용한다. wall/object는 캐릭터와 같은 `sortableChildren=true` container에서 사용하도록 독립 컴포넌트로 둔다.

- [ ] **Step 6: 검증하고 커밋한다**

```bash
npm test -- src/components/isometric/isoDepth.test.ts --runInBand
npx tsc --noEmit
git add src/components/isometric/isoDepth.ts src/components/isometric/isoDepth.test.ts src/components/isometric/IsoMap.tsx src/components/isometric/IsoMapObject.tsx data/isoVerticalSlice.ts
git commit -m "feat: render isometric room with stable object depth"
```

Expected: depth tests PASS, TypeScript 0 errors.

---

### Task 5: 4방향 캐릭터와 보행 애니메이션

**Files:**
- Create: `src/components/isometric/orientation.ts`
- Create: `src/components/isometric/orientation.test.ts`
- Create: `src/components/isometric/IsoCharacter.tsx`

**Interfaces:**
- Produces: `IsoDirection = 'ne' | 'nw' | 'se' | 'sw'`
- Produces: `facingToIsoDirection(facing): IsoDirection`
- Produces: `walkFrameAt(simulationTime, speed): 'idle' | 'walk-0'..'walk-3'`

- [ ] **Step 1: orientation 실패 테스트를 작성한다**

world `+x→se`, `+y→sw`, `-x→nw`, `-y→ne`를 검증한다. zero facing은 `se` fallback이다. speed 0은 idle, speed 양수에서 0/100/200/300/400ms가 walk 0/1/2/3/0인지 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/components/isometric/orientation.test.ts --runInBand`

Expected: FAIL with missing module.

- [ ] **Step 3: mapping과 frame selector를 구현한다**

screen-projected facing의 사분면을 사용하고 10FPS로 frame index를 계산한다. diagonal tie는 직전 direction prop이 있으면 유지하고 없으면 `se`를 쓴다.

- [ ] **Step 4: IsoCharacter를 구현한다**

props는 `role`, `position`, `facing`, `speed`, `simulationTime`, `projection`, `selected`, `onClick`이다. `role`은 viewer면 human, AI면 agent다. 128×128 frame과 `CHARACTER_FOOT_ANCHOR`를 적용하고 `zIndex=isoDepthKey(position,'object',50)`를 사용한다. selected ring은 캐릭터 발 아래의 얇은 cyan ellipse로 그리고 layout 크기를 바꾸지 않는다.

- [ ] **Step 5: 검증하고 커밋한다**

```bash
npm test -- src/components/isometric/orientation.test.ts --runInBand
npx tsc --noEmit
git add src/components/isometric/orientation.ts src/components/isometric/orientation.test.ts src/components/isometric/IsoCharacter.tsx
git commit -m "feat: add four direction isometric characters"
```

Expected: orientation/frame tests PASS, TypeScript 0 errors.

---

### Task 6: 정상 PixiGame에 실제 iso scene 연결

**Files:**
- Create: `src/rendering/isWalkableTile.ts`
- Create: `src/rendering/isWalkableTile.test.ts`
- Modify: `src/components/PixiGame.tsx`
- Modify: `src/components/Player.tsx`

**Interfaces:**
- Consumes: Tasks 1, 4, 5
- Produces: `isWalkableTile(map, tile): boolean`
- Produces: product iso branch selected by `VIEW_MODE`

- [ ] **Step 1: click validation 실패 테스트를 작성한다**

fractional world point를 floor한 tile이 내부 빈 칸이면 true, 외곽/가구/맵 밖이면 false인지 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test -- src/rendering/isWalkableTile.test.ts --runInBand`

Expected: FAIL with missing module.

- [ ] **Step 3: walkability를 구현한다**

```typescript
export function isWalkableTile(map: WorldMap, point: Point): boolean {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  return map.objectTiles.every((layer) => layer[x][y] === -1);
}
```

- [ ] **Step 4: theme/view mismatch를 차단한다**

`VIEW_MODE==='iso'`인데 map URL이 `/iso-slice/`를 포함하지 않으면 `ISO view requires WORLD_THEME=iso-slice`를 표시한다. iso-slice map인데 `VIEW_MODE==='topdown'`이면 `WORLD_THEME=iso-slice requires VITE_VIEW_MODE=iso`를 표시한다. 두 경우 모두 map input을 보내지 않는다.

- [ ] **Step 5: PixiGame render branch를 구현한다**

- iso metrics: 64×32, `originX=map.height*32+32`, `originY=32`
- viewport bounds: projection size + 64px margin
- floor는 `IsoMap`
- 벽·가구와 모든 `IsoCharacter`는 하나의 `Container sortableChildren`
- pointer는 `viewport.toWorld → projection.screenToWorld → floor → isWalkableTile`
- 기존 drag/click 10px threshold와 `moveTo` input을 유지
- human 초기 카메라는 projection center로 이동
- `ISO_DEBUG` branch와 `#iso-debug` page는 변경하지 않음

- [ ] **Step 6: Player renderer를 분기한다**

`VIEW_MODE==='iso'`에서는 기존 Character 대신 `IsoCharacter`를 반환하되 player click, selected element, PlayerDetails 연결은 동일 callback을 쓴다. top-down branch는 기존 코드를 그대로 유지한다.

- [ ] **Step 7: 자동 검증하고 커밋한다**

```bash
npm test -- src/rendering/isWalkableTile.test.ts --runInBand
npm test -- --runInBand
npx tsc --noEmit
npm run build
git add src/rendering/isWalkableTile.ts src/rendering/isWalkableTile.test.ts src/components/PixiGame.tsx src/components/Player.tsx
git commit -m "feat: connect isometric scene to live game state"
```

Expected: all Jest tests PASS, TypeScript 0 errors, build exits 0.

---

### Task 7: init, 실행 문서, 기능 회귀

**Files:**
- Modify: `README.md`
- Create: `.env.example`
- Modify: `docs/operations/convex-storage-verification.md`

**Interfaces:**
- Produces: exact iso development startup procedure

- [ ] **Step 1: 환경 예시를 추가한다**

```dotenv
WORLD_THEME=iso-slice
VITE_VIEW_MODE=iso
VITE_ISO_DEBUG=false
```

`WORLD_THEME`는 Convex deployment env이고 `VITE_VIEW_MODE`는 frontend env라는 차이를 README에 명시한다.

- [ ] **Step 2: 초기화와 실행 절차를 기록한다**

```bash
npx convex env set WORLD_THEME iso-slice
npx convex run testing:wipeAllTables
npx convex run init '{"numAgents":1}'
VITE_VIEW_MODE=iso npm run dev:frontend
```

로컬 Convex를 사용할 때는 첫 줄 대신 `npx convex dev --local` 환경 설정 절차를 사용한다.

- [ ] **Step 3: 수동 기능 회귀를 수행한다**

정상 앱에서 AI 한 명이 보이고 다음을 확인한다.

1. 사용자 캐릭터 클릭 시 PlayerDetails 표시
2. AI 클릭 시 identity/plan과 대화 panel 표시
3. 사용자 이동 10회 목적지 일치
4. AI 자율 이동
5. 사용자와 AI 대화 메시지 생성
6. freeze/unfreeze 후 위치와 대화 유지
7. `WORLD_THEME=space`, `VITE_VIEW_MODE=topdown`으로 재초기화한 뒤 기존 map 정상 표시

- [ ] **Step 4: 검증하고 커밋한다**

```bash
rg "WORLD_THEME=iso-slice|VITE_VIEW_MODE=iso|numAgents" README.md .env.example
npx tsc --noEmit
npm run build
git add README.md .env.example docs/operations/convex-storage-verification.md
git commit -m "docs: add isometric vertical slice runbook"
```

Expected: env terms found, TypeScript 0 errors, build exits 0.

---

### Task 8: 데스크톱·모바일 브라우저 검증

**Files:**
- Create: `docs/verification/isometric-vertical-slice.md`
- Create: `docs/verification/images/iso-desktop-1440x900.png`
- Create: `docs/verification/images/iso-mobile-390x844.png`

**Interfaces:**
- Consumes: live Convex app from Tasks 1-7
- Produces: visual approval record and screenshots

- [ ] **Step 1: 서버를 시작한다**

```bash
npm run dev:frontend -- --host 127.0.0.1
```

출력된 실제 port를 기록하고 browser control skill로 해당 localhost URL을 연다.

- [ ] **Step 2: desktop 1440×900을 검증한다**

다음 항목을 browser에서 직접 확인하고 screenshot을 저장한다.

- 10×10 floor가 비어 있지 않고 viewport 안에 framing됨
- wall/door/desk/console/chair PNG가 로드됨
- 사용자와 AI가 debug circle이 아닌 sprite로 표시됨
- 중앙 desk 앞/뒤 타일로 이동했을 때 캐릭터 가림 순서가 바뀜
- PlayerDetails와 대화 panel이 map을 가리지 않음

canvas 중앙 200×200 영역 screenshot의 서로 다른 불투명 RGB 색상이 20개 미만이면 blank render 실패로 판정한다.

- [ ] **Step 3: mobile 390×844을 검증한다**

map, sidebar, controls가 겹치지 않고 화면 밖으로 horizontal overflow하지 않아야 한다. 캐릭터 frame과 긴 identity text가 panel 밖으로 잘리지 않는지 확인한다.

- [ ] **Step 4: 클릭과 애니메이션을 검증한다**

서로 다른 walkable tile 10개를 클릭해 최종 world tile이 모두 일치하는지 기록한다. 이동 중 500ms 간격 screenshot 두 장의 캐릭터 bounding box 픽셀이 달라야 하며 발 접점 이동은 projection path를 따라야 한다.

- [ ] **Step 5: top-down 회귀와 debug page를 확인한다**

`WORLD_THEME=space`, `VITE_VIEW_MODE=topdown`으로 재초기화해 기존 map이 렌더되는지 확인한다. `#iso-debug`에서도 기존 line grid가 보이는지 확인한다.

- [ ] **Step 6: 검증 기록을 작성하고 커밋한다**

`isometric-vertical-slice.md`에 viewport, URL, commit SHA, 10개 click 결과, z-sort 결과, pixel count, top-down/debug 회귀 결과를 기록한다.

```bash
git add docs/verification/isometric-vertical-slice.md docs/verification/images/iso-desktop-1440x900.png docs/verification/images/iso-mobile-390x844.png
git commit -m "test: verify isometric slice across desktop and mobile"
```

---

## 완료 게이트

```text
Convex storage stabilization gate == PASS
normal app renders generated iso room == true
human click movement 10/10 == correct destination
AI autonomous movement == true
desk front/back occlusion == correct
chat and PlayerDetails regression == false
desktop and mobile canvas == nonblank
topdown and #iso-debug regression == false
```

하나라도 실패하면 상용 3D 에셋 구매나 전체 map 확장을 시작하지 않는다.

## 자체 검토 결과

- projection, backend collision, generated assets, object depth, character animation, live game integration, documentation, browser QA를 각각 독립 Task로 연결했다.
- wall/object/character가 같은 sortable container를 사용하도록 명시해 가구 뒤 가림을 실제로 검증한다.
- 임시 generated source의 실패 조건과 최대 재생성 횟수, exact output dimensions, anchor tolerance를 명시했다.
- normal app, mobile, top-down, `#iso-debug` 검증을 모두 포함했다.
- 전체 64×48 map, 8방향, commercial asset pipeline은 포함하지 않았다.
