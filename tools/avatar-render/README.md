# avatar-render (dev 전용)

Kenney 3D 캐릭터(`.glb`) → 4방향 걷기 PNG 프레임 추출. three.js를 **실제 Chromium**(gstack browse)에 띄워 렌더. 게임 번들엔 three 의존성 없음(CDN + import map).

## ⚠️ 반드시 browse `--headed` (실제 GPU)

이 머신의 **헤드리스 Chromium은 WebGL 컨텍스트를 못 만든다**(SwiftShader `BindToCurrentSequence failed`). 모든 browse 명령에 `--headed`를 붙여라. 안 그러면 `new THREE.WebGLRenderer()`가 던지고 아무것도 안 그려진다. headed 데몬이 뜨면 후속 명령(`js`, `console`, `url` 등)도 전부 `--headed`를 붙여야 같은 데몬에 붙는다.

## Provenance

- 소스: Kenney "Mini Characters" — https://kenney.nl/assets/mini-characters
  - 직접 다운로드: https://kenney.nl/media/pages/assets/mini-characters/bfc7e272b4-1774770718/kenney_mini-characters.zip
- 라이선스: Creative Commons CC0 1.0
- 모델: `pack/Models/GLB format/*.glb` (리깅됨, 애니 32종 incl. `walk` 0.667s)
- 추출일: 2026-06-30
- 스파이크 검증 모델: `character-male-a.glb`

## 실행

```bash
# 1) 팩을 _src/에 압축 해제(_src/는 gitignore — 위 URL로 재다운로드)
#    → _src/pack/Models/GLB format/*.glb 확보
# 2) 이 디렉터리를 정적 서빙
python3 -m http.server 8765
# 3) headed 브라우저로 렌더 페이지 로드 (file:// 는 glb fetch가 막히므로 http 사용)
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B --headed goto "http://localhost:8765/render.html?glb=http://localhost:8765/_src/pack/Models/GLB%20format/character-male-a.glb"
# 4) 전체 프레임 추출 (Task 2)
WALK_LEN=0.667 ./extract.sh "pack/Models/GLB format/character-male-a.glb" iso-agent
```

## 메모

- `render.html`은 `window.__renderReady`, `window.__animCount/__animNames/__walkLen`, `window.__renderFrame(dirIndex, animTime)`를 노출.
- 프레이밍(frustum/카메라 lookAt)은 발이 ~0.88에 닿고 캐릭터가 세로로 차도록 Task 2에서 튜닝.
