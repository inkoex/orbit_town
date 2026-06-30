# 프로젝트 라이브 상태 (먼저 읽기)

> 다음 세션이 **가장 먼저 읽는** 문서. "지금 어디 / 다음 한 칸 / 열린 실타래."
> 설계·플랜 상세 → `docs/superpowers/specs/`, `docs/superpowers/plans/`.
> 전략/사용자 fact → `~/.claude` 메모리.
> 갱신 주기: 결정 나는 순간 + 세션 마무리.

## 지금 (2026-07-01)

- 브랜치: `feat/iso-vertical-slice`
- **아바타 슬라이스 1 완료** (HEAD `4c54047`): Kenney Mini 렌더 파이프라인(`tools/avatar-render/`) → 테마-aware Asset Contract(`resolveAvatarFrames`) → `IsoCharacter`/`Player`. 6 에이전트 모두 같은 Kenney 아바타(`iso-agent`), **4방향 워크 정상**(이동=facing 일치, in-browser 검증).
- 모션 폴리시 완료 (`b9d27fa`): bob/숨쉬기/다리 흐름/입자/라이브 빌보드.

## 다음 한 칸 (resume 시)

**먼저 — 슬라이스 1 잔여 튜닝 2개:**
1. **아바타가 맵 셀 대비 약간 큼** → `tools/avatar-render/render.html`의 `frustum` 한 단계↑(0.62→0.72쯤) 후 재추출(`FRUSTUM=0.72 ... extract.sh`), 또는 `IsoCharacter` `SPRITE_W/SPRITE_H` 축소. 게임에서 눈으로.
2. **발밑 글로우 서클(active halo / selection ring)이 안 보임** → 큰 스프라이트에 가렸는지 / `active`-state 게이트인지 확인. `IsoCharacter`의 `drawActiveGlow`/`drawRing` + `Pulse` 래퍼, zIndex 점검.

**그 다음 — 슬라이스 2 (6명 다른 아바타):**
- 캐릭터당 `./tools/avatar-render/extract.sh "<glb>" <avatarId>` (파이프라인 이미 준비됨)
- `data/assets/isoSliceManifest.ts`의 `AVATAR_REGISTRY`에 등록
- `data/characters.ts`의 `isoDescriptions` 6명 캐릭터 이름 분화(`iso-agent` → `iso-agent-1..6`) + `isoCharacters` 추가
- **Convex 재시드 필요** (`npx convex run testing:wipeAllTables` → `npx convex run init`) — 쿼터 주의

## 열린 실타래 / 주의

- **Convex Free plan 쿼터 벽** — 재시드 시 건드림. 로컬 self-host 전환 보류 중.
- **렌더 툴은 `browse --headed` 필수** (이 머신 헤드리스 WebGL = SwiftShader 실패).
- **dev 서버 포트:** AI Town은 `npm run dev:frontend -- --port 5180` (NeoTrader가 5173 점유 → 충돌).

## 최근 결정 (상세는 스펙)

- 아바타 = Kenney Mini(CC0) + 렌더 파이프라인 + 테마-aware Asset Contract. 스펙: `docs/superpowers/specs/2026-06-30-avatar-identity-design.md`, 플랜: `docs/superpowers/plans/2026-06-30-avatar-render-slice1.md`.
- 세계관 = 코스메틱 축 (비전; 이번 빌드는 스페이스 한정). `~/.claude` 메모리 `project-orbit-cosmetic-worldview-axis`.
