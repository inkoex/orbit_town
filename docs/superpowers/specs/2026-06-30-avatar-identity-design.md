# 아바타 정체성 (Avatar Identity) — 설계 스펙

> **Date:** 2026-06-30
> **Branch:** `feat/iso-vertical-slice`
> **Status:** 설계 합의 완료, 구현 플랜 대기 (writing-plans는 다음 세션)
> **관련 메모리:** project-iso-3d-asset-pipeline, project-orbit-cosmetic-worldview-axis, project-orbit-business-thesis

## Goal

현재 모든 아바타가 **동일 실루엣**(단일 Kenney "Isometric Prototype" 모델 + role 틴트 하나)이라 에이전트끼리 식별이 안 된다. 각 에이전트가 **진짜 다른 아바타**로 보이게 한다.

동시에, 세계관(테마)을 **교체 가능한 코스메틱 축**으로 확장할 수 있도록 애셋 추상화를 테마-aware로 둔다. **단 이번 빌드는 "스페이스 팀" 슬라이스 하나로 한정** — 새 월드는 나중에 데이터만 얹으면 되는 모양만 잡는다.

## 배경 / 결정 맥락

- **절차적 색/마커는 거부.** 같은 실루엣이라 "진짜 다른 아바타" 욕구를 근본적으로 못 채운다.
- **드롭인 2D 이소 멀티캐릭터 워크 팩은 사실상 없다.** CC0 소스(Kenney Mini Characters, 16+종, 애니메이션 포함, CC0)는 **3D 모델**이라 우리 2D 4방향 프레임 포맷으로 **렌더 스텝이 1회 필요**하다. (현재 아바타도 Kenney 3D를 이소로 렌더한 결과물.)
- 이 렌더 스텝 = 메모리에 적어둔 **Asset Contract / 자가생성 파이프라인(north star)** 그 자체. CC0 소스라 3D 자작 0, 리스크 최소화된 버전.
- **비전(별도 메모리):** 세계관 = 코스메틱 과금/리텐션 축. 추상화만 테마-aware로, 빌드는 스페이스 한정 (스코프 sprawl 경계).
- **미감:** Kenney Mini는 따뜻한 토온. 차가운 네온 sci-fi 씬과 톤차가 있으나, 멀리 줌아웃된 씬(scale 0.19)에서 또렷한 실루엣이 식별에 유리. 사용자 "의외로 매력 있다" 판단으로 채택.

## Non-goals (이번 빌드 제외)

- 멀티월드 코스메틱 플랫폼 / 사용자 커스터마이즈 UI
- 3D 캐릭터 자작 (CC0 소스 사용)
- 백엔드/Convex 변경 (렌더는 dev-time, 런타임은 정적 애셋 로딩)
- 절차적 아바타 변형 (안전판으로만 보존)

## 아키텍처

3개 유닛 + 명확한 경계:

### 1. 아바타 매니페스트 (Asset Contract)
- **책임:** `(theme, avatarId)` → 프레임세트(4방향 × idle+walk 경로) + 출처 기록(소스 팩/모델/버전/라이선스)으로 해석.
- **인터페이스:** 순수 리졸버 함수. `resolveAvatar(theme, avatarId) → { se:{idle,walk[]}, sw:..., nw:..., ne:... }`. 미존재 시 명시적 fallback(현재 단일 모델).
- **의존성:** 없음(정적 데이터). → 단위 테스트 용이.
- 현재 하드코딩된 `ISO_CHARACTER_FRAMES`(data/assets/isoSliceManifest.ts)를 이 리졸버로 대체.
- `WORLD_THEME` / `convex/util/theme.ts`와 정렬.

### 2. 렌더 툴 (dev-time, 1회성)
- **책임:** Kenney Mini `.glb` → `se/sw/nw/ne` × (idle + walk N프레임) PNG. 현재 규격(256×512, foot anchor 0.5/0.88, 투명 배경)에 맞춤.
- **인터페이스:** 입력 = glb + 캐릭터 id + 카메라 규격(iso yaw 4각). 출력 = `public/assets/<theme>/<avatarId>/character-<dir>-<idle|walk-n>.png` + provenance json.
- **구현 후보:** ① 인-스택 three.js를 헤드리스 Chromium(browse가 가진 것 재사용)으로 띄워 glb 로드→애니 샘플→4각 스크린샷 (1순위, 새 무거운 의존성 0). ② Blender 헤드리스 python (대안).
- **런타임과 분리:** 게임 번들에 안 들어감. 산출물(PNG)만 들어감.

### 3. 런타임 (IsoCharacter + 에이전트 매핑)
- **책임:** `avatarId`로 매니페스트 조회 후 프레임 렌더. role 틴트는 정체성 아님 → 네온 림/액센트로 강등.
- **변경:** `IsoCharacter`가 `avatarId` prop 수신. 에이전트→avatarId 매핑은 `data/isoVerticalSlice.ts`에 저작.

## 데이터 흐름

```
Kenney .glb ──[렌더 툴(dev)]──▶ PNG 프레임세트 + provenance
                                      │
                                      ▼
                       public/assets/<theme>/<avatarId>/...
                                      │
              (theme, avatarId) ──[매니페스트 리졸버]──▶ 프레임 경로
                                      │
                                      ▼
                          IsoCharacter ──▶ 화면 렌더
```

## 스코프 / 슬라이스

- **슬라이스 1 (검증):** Kenney Mini 캐릭터 **1개를 끝까지 관통** — 모델 → 렌더 툴 1프레임 정확히 → 전체 프레임세트 → 매니페스트 → 게임에서 확인. 렌더 도구 de-risk가 핵심.
- **슬라이스 2 (양산):** 나머지 5개 배치 렌더 + 6 에이전트 → avatarId 매핑.
- **이후 (별도 스펙):** 다른 월드 팩(판타지/언더그라운드/클라우드 등). **이번엔 안 함.**

## 테스트 전략

- **매니페스트 리졸버:** 순수함수 단위 테스트 — 조회 정확성, fallback 동작, 방향/프레임 완전성. (기존 isoSliceManifest.test.ts 패턴.)
- **렌더 출력:** 산출물 검증 — 프레임 수/크기(256×512)/투명 배경/파일 존재.
- **시각 확인:** 브라우저에서 실제 렌더(메모리: 프론트 닿는 변경은 브라우저 로드까지 확인 — feedback-verify-browser-load).

## 리스크 / 안전판

- **렌더 툴링이 이번 작업의 진짜 무게.** → 슬라이스 1의 첫 스파이크(1프레임 정확히)로 조기 검증. 막히면 **절차적-라이트(색+액센트+체형)로 후퇴**.
- **미감 충돌(토온 vs 네온):** 가벼운 림라이트/액센트 후처리로 매칭. 슬라이스 1 통과 후 판단.
- **줌 가독성:** 미니 비율이 유리하다고 판단했으나 실제 게임 줌에서 재확인.

## 열린 결정 (구현 플랜에서 확정)

- 렌더 도구: three.js-in-headless(1순위) vs Blender — 슬라이스 1 스파이크로 결정.
- 걷기 프레임 수(현재 4 유지?) + iso 카메라 yaw 4각의 정확값 + 라이팅.
- 어떤 6개 Mini 캐릭터를 6 에이전트에 매핑할지.

## 다음 단계

writing-plans 스킬로 구현 플랜 작성 (다음 세션). 슬라이스 1(1캐릭터 end-to-end)부터.
