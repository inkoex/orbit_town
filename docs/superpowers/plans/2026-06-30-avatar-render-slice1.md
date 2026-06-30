# Avatar Render Pipeline — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한 개의 Kenney Mini 캐릭터를 `.glb` → 4방향 걷기 PNG → 게임 화면까지 관통시켜, 렌더 파이프라인 + 테마-aware Asset Contract + 런타임 연결을 한 번에 증명한다(de-risk).

**Architecture:** Kenney CC0 3D 모델을 **헤드리스 Chromium(gstack browse)에 띄운 three.js 페이지**로 4방향 × (idle+walk) 프레임을 렌더해 PNG로 추출(게임 번들에 three 의존성 추가 없음). 런타임은 `avatarId → 프레임세트` 매니페스트로 해석하며, 미존재 시 현재 단일 모델로 fallback. 슬라이스 1은 기존 공유 캐릭터 `iso-agent` 하나를 새 아바타에 매핑하므로 **Convex 재시드 불필요**.

**Tech Stack:** TypeScript, React, PixiJS(@pixi/react v7), three.js(CDN, dev 전용), gstack browse(헤드리스 Chromium), Jest.

## Global Constraints

- 렌더 툴은 **dev 전용** — 게임 번들/`package.json` 의존성에 three 추가 금지. CDN으로 browse Chromium에서만 로드.
- 애셋 입력은 **CC0만**(Kenney Mini Characters, CC0 1.0). 출처/모델/버전을 provenance 파일에 기록.
- 출력 프레임 규격: PNG, **투명 배경**, 표시 규격 256×512, foot anchor `{x:0.5, y:0.88}`(기존 `CHARACTER_FOOT_ANCHOR`와 동일).
- 방향: `se`, `sw`, `nw`, `ne` (기존 `ISO_DIRECTIONS` 순서·이름 그대로).
- **Convex/백엔드 코드 변경 없음.** 슬라이스 1은 프론트 + 정적 애셋만. 재시드 없음.
- 테스트 실행: `NODE_OPTIONS=--experimental-vm-modules npx jest --no-coverage`.
- 기존 단일 모델 경로(`/ai-town/assets/iso-slice/character-<dir>-...`)는 **fallback 기본값으로 보존**.

## File Structure

- **Create** `tools/avatar-render/render.html` — three.js 렌더러. `.glb` 로드, 이소 직교 카메라, `window.__renderReady` 플래그 + `window.__renderFrame(dirIndex, animTime)`(canvas에 그림). dev 전용.
- **Create** `tools/avatar-render/extract.sh` — browse로 render.html을 띄워 방향×프레임을 PNG로 추출하는 드라이버.
- **Create** `tools/avatar-render/README.md` — 실행법 + provenance(소스 팩 URL, 라이선스, 모델명, 추출일).
- **Create** `public/assets/iso-slice/<avatarId>/character-<dir>-<idle|walk-N>.png` — 산출 프레임(슬라이스 1은 1 아바타).
- **Modify** `data/assets/isoSliceManifest.ts` — `AVATAR_REGISTRY` + `resolveAvatarFrames(avatarId)` 추가(fallback 포함).
- **Modify** `data/assets/isoSliceManifest.test.ts` — 리졸버 테스트.
- **Modify** `src/components/isometric/IsoCharacter.tsx` — `avatarId` prop 수신 → 프레임 해석.
- **Modify** `src/components/Player.tsx` — iso 분기에서 `avatarId={playerCharacter}` 전달.

---

### Task 1: 렌더 스파이크 — Kenney 모델 1개의 1프레임을 깨끗하게 뽑는다

> 이 태스크는 **탐색적 스파이크**다(순수 TDD 아님). 목적은 "헤드리스 three.js로 `.glb`를 이소 각도에서 투명 PNG로 찍을 수 있나?"라는 가장 큰 미지수를 가장 싸게 터는 것. **게이트:** 캐릭터가 알아볼 수 있는 형태로, 투명 배경에, 대략 이소 각도로 한 장 나오면 통과. 실패 시(헤드리스 WebGL이 glb를 못 다루면) Blender 헤드리스로 전환하거나 절차적-라이트로 후퇴 — 이 태스크 안에서 결정.

**Files:**
- Create: `tools/avatar-render/render.html`
- Create: `tools/avatar-render/README.md`
- 임시 입력: Kenney Mini Characters 팩에서 추출한 `.glb` 1개 (스크래치패드 경로)

- [ ] **Step 1: Kenney Mini Characters 팩 다운로드 + .glb 1개 추출**

```bash
SP="$(git rev-parse --show-toplevel)/tools/avatar-render/_src"
mkdir -p "$SP"
# 팩 zip 다운로드(브라우저 다운로드 핸들러 경유)
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto "https://kenney.nl/assets/mini-characters" >/dev/null
# 페이지의 Download 버튼 href를 찾아 받는다. 못 찾으면 수동으로 받아 _src/에 둔다.
$B links | grep -iE "download|\.zip" | head
# zip을 _src/에 두고 푼 뒤, glb(또는 gltf) 하나의 경로를 확인:
ls -R "$SP" | grep -iE "\.glb|\.gltf" | head
```

Expected: `_src/` 아래에 캐릭터 `.glb`(또는 `.gltf`) 파일 경로 하나 확보. (Kenney 3D 팩은 보통 `Models/GLB/` 또는 `glTF/` 폴더에 캐릭터별 파일.)

- [ ] **Step 2: render.html 작성(첫 시도 — 각도/조명은 이 태스크에서 튜닝)**

```html
<!doctype html>
<meta charset="utf-8" />
<style>html,body{margin:0;background:transparent}#c{display:block}</style>
<canvas id="c" width="256" height="512"></canvas>
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

const W = 256, H = 512;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(W, H, false);
renderer.setClearColor(0x000000, 0); // 투명 배경

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(2, 4, 3);
scene.add(key);

// 2:1 이소 = 직교 카메라를 위에서 비스듬히. 초기값(스파이크에서 튜닝):
const aspect = W / H;
const frustum = 2.2; // 캐릭터가 세로로 꽉 차게 조절
const cam = new THREE.OrthographicCamera(
  -frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 100,
);
// 이소: 방위 45°, 고도 ~30°. (arctan(0.5)=26.57°가 정통 2:1; 스파이크에서 미세조정)
cam.position.set(6, 6 * Math.tan(THREE.MathUtils.degToRad(30)) * Math.SQRT2, 6);
cam.lookAt(0, 1, 0);

const pivot = new THREE.Group(); // 모델을 이 그룹에 넣고 yaw로 4방향 회전
scene.add(pivot);
let mixer = null, walk = null;

const params = new URLSearchParams(location.search);
const url = params.get('glb');
new GLTFLoader().load(url, (gltf) => {
  const model = gltf.scene;
  // 발이 원점(y=0)에 오도록 바운딩박스로 정렬
  const box = new THREE.Box3().setFromObject(model);
  model.position.y -= box.min.y;
  pivot.add(model);
  if (gltf.animations.length) {
    mixer = new THREE.AnimationMixer(model);
    walk = gltf.animations.find((a) => /walk|run/i.test(a.name)) || gltf.animations[0];
    mixer.clipAction(walk).play();
  }
  window.__renderReady = true;
});

// dirIndex: 0=se,1=sw,2=nw,3=ne. animTime: 초(걷기 위상). idle은 animTime<0.
window.__renderFrame = (dirIndex, animTime) => {
  pivot.rotation.y = THREE.MathUtils.degToRad(45 + dirIndex * 90);
  if (mixer) { mixer.setTime(animTime < 0 ? 0 : animTime); }
  renderer.render(scene, cam);
  return canvas.toDataURL('image/png');
};
</script>
```

- [ ] **Step 3: browse로 띄워 1프레임 스크린샷**

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
ROOT="$(git rev-parse --show-toplevel)"
GLB="file://$ROOT/tools/avatar-render/_src/<추출한 glb 상대경로>"
$B goto "file://$ROOT/tools/avatar-render/render.html?glb=$GLB"
$B wait --networkidle
$B js "window.__renderReady === true"            # true 나와야 함
$B js "window.__renderFrame(0, 0.3)" --out /tmp/spike.png   # se 방향 한 장
```

Expected: `window.__renderReady`가 `true`. `/tmp/spike.png`가 생성됨.

- [ ] **Step 4: 결과를 눈으로 확인(게이트)**

```bash
open /tmp/spike.png   # 사람이 확인: 캐릭터가 보이나? 투명 배경? 대략 이소 각도?
```

판정:
- **통과** → Task 2로. (각도·frustum·조명은 Task 2에서 마저 튜닝)
- **빈/검은/깨진 이미지** → render.html의 카메라/조명/스케일을 조정해 Step 3 반복(최대 ~1시간 타임박스).
- **헤드리스 WebGL이 glb 자체를 못 로드** → README에 기록하고 **Blender 헤드리스 경로로 전환**(별도 스파이크) 또는 절차적-라이트로 후퇴. 여기서 멈추고 사용자에게 보고.

- [ ] **Step 5: README에 접근법 + provenance 기록 후 커밋**

```bash
cat > tools/avatar-render/README.md <<'EOF'
# avatar-render (dev 전용)
Kenney 3D 캐릭터(.glb) → 4방향 걷기 PNG 추출. three.js를 헤드리스 Chromium(gstack browse)에 띄워 렌더.
게임 번들엔 three 의존성 없음(CDN).

## Provenance
- 소스: Kenney "Mini Characters" — https://kenney.nl/assets/mini-characters
- 라이선스: Creative Commons CC0 1.0
- 추출 모델: <파일명>
- 추출일: 2026-06-30

## 실행
1. _src/에 팩 압축 해제(.glb 확보)
2. ./extract.sh <glb경로> <avatarId>
EOF
git add tools/avatar-render/render.html tools/avatar-render/README.md
git commit -m "feat: avatar render spike — headless three.js renders one Kenney glb frame"
```

---

### Task 2: 한 아바타의 전체 20프레임 세트 추출 + 규격 검증

**Files:**
- Create: `tools/avatar-render/extract.sh`
- Create: `public/assets/iso-slice/<avatarId>/character-<dir>-<idle|walk-N>.png` (20장)
- Test: `tools/avatar-render/check-frames.sh` (간단 검증 스크립트)

**Interfaces:**
- Consumes: Task 1의 `render.html`(`window.__renderReady`, `window.__renderFrame(dirIndex, animTime)`).
- Produces: `public/assets/iso-slice/<avatarId>/` 아래 정확히 20개 PNG. 파일명 규칙은 기존 `isoSliceManifest.ts`의 `character()`와 동일: `character-<dir>-idle.png`, `character-<dir>-walk-0..3.png`. `<avatarId>`는 슬라이스 1에서 `iso-agent`(기존 공유 캐릭터에 그대로 매핑).

- [ ] **Step 1: extract.sh 작성**

```bash
cat > tools/avatar-render/extract.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
GLB_REL="$1"; AVATAR_ID="$2"
ROOT="$(git rev-parse --show-toplevel)"
B="$HOME/.claude/skills/gstack/browse/dist/browse"
OUT="$ROOT/public/assets/iso-slice/$AVATAR_ID"
mkdir -p "$OUT"
GLB="file://$ROOT/tools/avatar-render/_src/$GLB_REL"
$B goto "file://$ROOT/tools/avatar-render/render.html?glb=$GLB"
$B wait --networkidle
DIRS=(se sw nw ne)
# 걷기 4프레임의 위상(초) — 걷기 클립 길이의 0/25/50/75%. WALK_LEN는 클립에 맞게.
WALK_LEN="${WALK_LEN:-0.8}"
for i in 0 1 2 3; do
  d="${DIRS[$i]}"
  $B js "window.__renderFrame($i, -1)" --out "$OUT/character-$d-idle.png"
  for f in 0 1 2 3; do
    t=$(awk "BEGIN{print $f/4*$WALK_LEN}")
    $B js "window.__renderFrame($i, $t)" --out "$OUT/character-$d-walk-$f.png"
  done
done
echo "wrote 20 frames to $OUT"
EOF
chmod +x tools/avatar-render/extract.sh
```

- [ ] **Step 2: 한 아바타 추출 실행**

```bash
WALK_LEN=0.8 ./tools/avatar-render/extract.sh "<Task1의 glb 상대경로>" iso-agent
```

Expected: `public/assets/iso-slice/iso-agent/` 아래 PNG 20장.

- [ ] **Step 3: 규격 검증 스크립트 작성 + 실행**

```bash
cat > tools/avatar-render/check-frames.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
DIR="public/assets/iso-slice/$1"
n=$(ls "$DIR"/character-*.png 2>/dev/null | wc -l | tr -d ' ')
[ "$n" -eq 20 ] || { echo "FAIL: expected 20 frames, got $n"; exit 1; }
for f in "$DIR"/character-*.png; do
  read w h < <(sips -g pixelWidth -g pixelHeight "$f" | awk '/pixel/{print $2}' | paste -sd' ' -)
  [ "$w" = "256" ] && [ "$h" = "512" ] || { echo "FAIL: $f is ${w}x${h}, want 256x512"; exit 1; }
  sips -g hasAlpha "$f" | grep -q "hasAlpha: yes" || { echo "FAIL: $f no alpha"; exit 1; }
done
echo "OK: 20 frames, 256x512, alpha"
EOF
chmod +x tools/avatar-render/check-frames.sh
./tools/avatar-render/check-frames.sh iso-agent
```

Expected: `OK: 20 frames, 256x512, alpha`. (만족 안 하면 Task 1 render.html의 frustum/카메라/캔버스 크기를 조정해 Task 2 Step 2부터 반복.)

- [ ] **Step 4: 한 방향 세트를 눈으로 확인**

```bash
open public/assets/iso-slice/iso-agent/character-se-walk-0.png \
     public/assets/iso-slice/iso-agent/character-se-walk-2.png
```

Expected(사람 판정): 발이 프레임 하단(≈0.88)에 닿고, walk-0과 walk-2의 다리 포즈가 눈에 띄게 다름(걷는 중). 아니면 `WALK_LEN`/카메라 조정 후 재추출.

- [ ] **Step 5: 산출물 + 툴 커밋**

```bash
git add tools/avatar-render/extract.sh tools/avatar-render/check-frames.sh public/assets/iso-slice/iso-agent
git commit -m "feat: render full 20-frame avatar set for one Kenney character"
```

---

### Task 3: 아바타 매니페스트 리졸버 (`resolveAvatarFrames`)

**Files:**
- Modify: `data/assets/isoSliceManifest.ts`
- Test: `data/assets/isoSliceManifest.test.ts`

**Interfaces:**
- Consumes: 기존 `ISO_CHARACTER_FRAMES`(fallback 기본값), `ISO_DIRECTIONS`, `IsoDirection`.
- Produces: `resolveAvatarFrames(avatarId?: string): Record<IsoDirection, { idle: string; walk: string[] }>` — 등록된 avatarId면 그 프레임세트, 아니면 `ISO_CHARACTER_FRAMES`. `AVATAR_REGISTRY: Record<string, Record<IsoDirection, { idle: string; walk: string[] }>>`.

- [ ] **Step 1: 실패하는 테스트 작성**

`data/assets/isoSliceManifest.test.ts`에 추가:

```ts
import { resolveAvatarFrames, ISO_CHARACTER_FRAMES } from './isoSliceManifest';

describe('resolveAvatarFrames', () => {
  it('등록된 아바타는 그 아바타 폴더 경로를 돌려준다', () => {
    const frames = resolveAvatarFrames('iso-agent');
    expect(frames.se.idle).toContain('/iso-slice/iso-agent/');
    expect(frames.se.walk).toHaveLength(4);
    expect(frames.se.walk[2]).toContain('character-se-walk-2.png');
  });

  it('네 방향이 모두 있다', () => {
    const frames = resolveAvatarFrames('iso-agent');
    for (const d of ['se', 'sw', 'nw', 'ne'] as const) {
      expect(frames[d].idle).toContain(`character-${d}-idle.png`);
    }
  });

  it('미등록 아바타는 기본(fallback) 프레임으로 떨어진다', () => {
    expect(resolveAvatarFrames('does-not-exist')).toBe(ISO_CHARACTER_FRAMES);
  });

  it('avatarId가 없으면 기본 프레임을 쓴다', () => {
    expect(resolveAvatarFrames(undefined)).toBe(ISO_CHARACTER_FRAMES);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `NODE_OPTIONS=--experimental-vm-modules npx jest data/assets/isoSliceManifest.test.ts --no-coverage`
Expected: FAIL — `resolveAvatarFrames is not a function`(아직 미구현).

- [ ] **Step 3: 최소 구현**

`data/assets/isoSliceManifest.ts`에 `ISO_CHARACTER_FRAMES` 정의 아래로 추가:

```ts
// 아바타별 프레임세트: 같은 파일명 규칙을 avatarId 하위 폴더에서 찾는다.
const framesIn = (avatarId: string): Record<IsoDirection, { idle: string; walk: string[] }> => {
  const dir = (d: IsoDirection) => ({
    idle: `/ai-town/assets/iso-slice/${avatarId}/character-${d}-idle.png`,
    walk: [0, 1, 2, 3].map(
      (i) => `/ai-town/assets/iso-slice/${avatarId}/character-${d}-walk-${i}.png`,
    ),
  });
  return { se: dir('se'), sw: dir('sw'), nw: dir('nw'), ne: dir('ne') };
};

// Asset Contract: 런타임은 avatarId만 참조. 슬라이스 1은 공유 캐릭터 'iso-agent' 하나.
// (테마 차원은 슬라이스 2 이후 — 지금은 단일 테마 'iso-slice' 경로에 박힘.)
export const AVATAR_REGISTRY: Record<
  string,
  Record<IsoDirection, { idle: string; walk: string[] }>
> = {
  'iso-agent': framesIn('iso-agent'),
};

// 미등록 avatarId는 기존 단일 모델(최상위 경로)로 fallback.
export function resolveAvatarFrames(
  avatarId?: string,
): Record<IsoDirection, { idle: string; walk: string[] }> {
  return (avatarId && AVATAR_REGISTRY[avatarId]) || ISO_CHARACTER_FRAMES;
}
```

- [ ] **Step 4: 통과 확인**

Run: `NODE_OPTIONS=--experimental-vm-modules npx jest data/assets/isoSliceManifest.test.ts --no-coverage`
Expected: PASS (신규 4개 포함 전부 green).

- [ ] **Step 5: 커밋**

```bash
git add data/assets/isoSliceManifest.ts data/assets/isoSliceManifest.test.ts
git commit -m "feat: avatar manifest resolver with fallback (resolveAvatarFrames)"
```

---

### Task 4: IsoCharacter가 avatarId로 프레임을 해석

**Files:**
- Modify: `src/components/isometric/IsoCharacter.tsx`

**Interfaces:**
- Consumes: Task 3의 `resolveAvatarFrames(avatarId)`.
- Produces: `IsoCharacter`가 `avatarId?: string` prop를 받아 `resolveAvatarFrames(avatarId)[dir]`로 프레임을 고른다. avatarId 없으면 기존과 동일(fallback).

- [ ] **Step 1: import + prop 추가, 프레임 소스 교체**

`src/components/isometric/IsoCharacter.tsx`:

```tsx
// import 라인: ISO_CHARACTER_FRAMES 대신 resolveAvatarFrames 도 가져온다
import { resolveAvatarFrames, CHARACTER_FOOT_ANCHOR } from '../../../data/assets/isoSliceManifest';
```

Props 인터페이스에 추가:

```tsx
  // 어떤 아바타 프레임세트를 쓸지. 미지정 시 기본 모델로 fallback.
  avatarId?: string;
```

구조분해에 `avatarId` 추가하고, 프레임 소스 한 줄 교체:

```tsx
  const frames = resolveAvatarFrames(avatarId)[dir];
```

(기존 `const frames = ISO_CHARACTER_FRAMES[dir];` 를 위 줄로 대체. `ISO_CHARACTER_FRAMES` 직접 import는 더 안 쓰면 제거.)

- [ ] **Step 2: 타입체크 + 전체 테스트(회귀)**

Run: `npx tsc --noEmit && NODE_OPTIONS=--experimental-vm-modules npx jest --no-coverage`
Expected: tsc 0 에러, 전체 jest PASS. (프레임 선택 로직은 Task 3에서 단위테스트됨 — IsoCharacter는 PIXI 컴포넌트라 시각 검증은 Task 5.)

- [ ] **Step 3: 커밋**

```bash
git add src/components/isometric/IsoCharacter.tsx
git commit -m "feat: IsoCharacter resolves frames by avatarId"
```

---

### Task 5: Player가 avatarId 전달 + 브라우저 시각 검증

**Files:**
- Modify: `src/components/Player.tsx`

**Interfaces:**
- Consumes: `IsoCharacter`의 `avatarId` prop(Task 4), `playerCharacter`(이미 `Player.tsx:44`에서 계산됨 = `game.playerDescriptions.get(player.id)?.character`, iso 에이전트는 `'iso-agent'`).
- Produces: iso 분기의 `<IsoCharacter>`가 `avatarId={playerCharacter}`를 받음 → 6 에이전트 모두 `'iso-agent'` 레지스트리 항목(새 Kenney 모델)으로 렌더. (에이전트별 *구별*은 슬라이스 2: 캐릭터 이름 분화 + 재시드.)

- [ ] **Step 1: IsoCharacter 호출에 avatarId 전달**

`src/components/Player.tsx`의 iso 분기(`<IsoCharacter role={...} ... />`, 약 109행)에 prop 추가:

```tsx
      <IsoCharacter
        role={isViewer ? 'human' : 'agent'}
        avatarId={playerCharacter}
        // ...기존 props 유지
```

- [ ] **Step 2: 타입체크 + 전체 테스트**

Run: `npx tsc --noEmit && NODE_OPTIONS=--experimental-vm-modules npx jest --no-coverage`
Expected: tsc 0 에러, 전체 PASS.

- [ ] **Step 3: 앱 띄워 브라우저에서 시각 확인**

```bash
# 프론트만 띄우면 됨(슬라이스 1은 재시드 불필요, 기존 월드 데이터 사용)
npm run dev:frontend
```

`/run` 스킬 또는 gstack browse로 로드 후 확인:
- iso 씬의 에이전트들이 **새 Kenney 모델**로 렌더되는가(기존 프로토타입 회색 인간이 아니라).
- 걸을 때 walk 프레임이 돌아가는가.
- 발이 타일에 닿는가(foot anchor 정상), 4방향 전환이 자연스러운가.
- 멀리 줌아웃(scale 0.19)에서 실루엣이 읽히는가.

판정: 위가 되면 **슬라이스 1 통과 — 렌더 파이프라인 증명 완료.** 정렬/각도/조명 미세 문제는 Task 1·2의 render.html 파라미터로 되돌아가 재추출.

- [ ] **Step 4: 커밋**

```bash
git add src/components/Player.tsx
git commit -m "feat: wire iso agents to avatarId-based avatar frames"
```

---

## Self-Review (작성자 체크)

- **스펙 커버리지:** 아바타 매니페스트(Task 3) ✓, 렌더 툴(Task 1·2) ✓, 런타임(Task 4·5) ✓, 첫 슬라이스=1캐릭터 end-to-end ✓, fallback 안전판 ✓. **테마 차원**은 슬라이스 1에서 단일 테마 경로(`iso-slice`)에 박고 avatarId 키만 도입 — 멀티-테마 일반화는 슬라이스 2/이후(스펙의 스코프 가드와 일치).
- **플레이스홀더:** Task 1·2의 렌더 코드는 실제 동작 코드(스파이크라 카메라/frustum/WALK_LEN은 명시적으로 "이 태스크에서 튜닝"으로 표기 — 추상 TODO 아님). Task 3은 완전 TDD.
- **타입 일관성:** `resolveAvatarFrames`(Task 3 정의 → Task 4 사용), `avatarId` prop(Task 4 정의 → Task 5 전달), `playerCharacter`(기존 Player.tsx:44) 일관.
- **알려진 의존:** Task 4·5는 Task 1·2 산출물(실제 PNG)이 있어야 시각 검증 가능. Task 3은 독립(경로 문자열만).

## Execution Handoff

플랜 저장 완료: `docs/superpowers/plans/2026-06-30-avatar-render-slice1.md`.

**주의:** Task 1은 탐색적 스파이크다. 헤드리스 three.js가 막히면 거기서 멈추고 Blender/절차적-라이트 결정을 사용자와 의논한다(며칠 늪 방지).