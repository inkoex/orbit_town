# Orbit Station 🛰️

> **InKoEx의 AI 에이전트 우주정거장** — AI 팀이 일하는 모습을 텍스트 로그가 아니라 **한 장면**으로 보여주는 감성 전시(embodiment) 레이어.

에이전트 오케스트레이션 도구는 많지만 전부 관리 콘솔의 얼굴을 하고 있다. Orbit Station은 반대쪽 절반 — **"내 AI 회사가 살아 움직이는 걸 보는 경험"** — 을 만든다. 아바타들이 이소메트릭 우주 플랫폼 위를 걸어다니고, 빌보드 티커에는 실제 작업 이벤트가 흐르고, 승인이 필요한 순간에는 에이전트가 멈춰서 사람을 기다린다.

<p align="center"><i>스페이스 테마 iso 맵 · 온-모델 로봇 아바타 패밀리 · 실시간 workEvents 티커</i></p>

## 아키텍처 한 장

```
[작업 레이어]  Company OS / (미래) LangGraph / 어떤 오케스트레이터든
      │  각자의 네이티브 이벤트를 →
      ▼
[중립 계약]  workEvents (어휘 9종 봉투) ──── convex/workEventsContract.ts
      │  Convex reactive 구독
      ▼
[전시 레이어]  Orbit Station — iso 맵 · 아바타 연기 · 빌보드 티커
```

- **이음새가 자산이다** — 소스(엔진)는 어댑터 하나로 교체 가능. UI는 계약만 읽는다.
- **전시는 싸야 한다** — 월드 Frozen 상태에서 아바타 연기는 클라이언트 전용, LLM 잡담은 캔드(canned).
- 현재 상태·다음 한 칸·열린 실타래 = **[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)** (단일 소스, 먼저 읽기)

## 실행

```bash
npm install
npm run dev:frontend -- --port 5180   # 프론트 (백엔드는 클라우드 Convex dev)
# 가짜 제너레이터 데모: 빌보드에 "회사의 하루" 흘리기
node scripts/workevents/replay.mjs --once
```

테스트: `npm test` (jest) · `npm run test:convex` (vitest+convex-test) · `npx tsc --noEmit`

## 저장소 구조 (Orbit 고유 부분)

| 경로 | 역할 |
|---|---|
| `convex/workEventsContract.ts` | 중립 이벤트 계약 (어휘 9종 + 봉투) |
| `convex/workEvents.ts` | `push`(멱등)/`list`/`clearSource` |
| `scripts/workevents/` | M002 대본 + 재생기 (가짜 제너레이터) |
| `src/components/` `src/index.css` | iso 전시 레이어 (PixiJS, 별필드, HUD 글라스) |
| `tools/avatar-render/` | 3D→스프라이트 베이크 파이프라인 (RUNBOOK 참조) |
| `docs/PROJECT_STATUS.md` | **라이브 상태 (먼저 읽기)** |
| `docs/design/` `docs/superpowers/` | 결정 기록 · 스펙 · 플랜 |

## 크레딧

[a16z-infra/ai-town](https://github.com/a16z-infra/ai-town) (MIT)을 베이스로 포크해 전시 레이어·아바타 시스템·workEvents 계약을 얹었다. 원본 문서는 [docs/UPSTREAM_README.md](docs/UPSTREAM_README.md). 아바타 원형은 Kenney Mini(CC0)에서 출발해 자체 3D 파이프라인으로 재구축. 시뮬레이션 척추는 [Convex](https://convex.dev).

— Private repo · InKoEx (shin@inkoex.com)
