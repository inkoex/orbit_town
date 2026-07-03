# Paperclip AI 연동 검토 — Orbit Station의 작업 레이어 후보

> **2026-07-03 · 상태: 조사·전략검증 완료, 결정 대기 (사용자 정독용)**
> 근거: Claude 웹조사(GitHub README + Agent Integration 문서) + Codex 전략 교차검증(read-only)
> 관련: `2026-07-01-conversation-vs-work-layer.md`, `2026-07-02-work-layer-stack.md`(원래 CrewAI 결정), `avatar-system-plan.md` 부록 A(Frozen-전시)·D(부하 실측)

## 0. 한 줄 요약

**Paperclip은 우리가 CrewAI로 지으려던 "작업 레이어"의 강력한 기성품 후보다. 단, "전면 교체"가 아니라 "중립 이벤트 계약을 먼저 세우고 Paperclip을 source adapter 하나로 붙인다"가 정답 (Codex 동의). 그리고 Paperclip은 이미 관리 UI가 있으므로, Orbit Station의 정체성이 "관리 콘솔"이 아니라 "한 화면에서 팀 리듬·산출물 흐름을 읽는 전시"임을 더 날카롭게 못박아야 한다.**

## 1. Paperclip AI란 (확인된 사실)

- 오픈소스 **에이전트 오케스트레이션 플랫폼**. 2026-03 출시, ~70k GitHub stars (`paperclipai/paperclip`).
- **컨셉:** 에이전트를 **조직도(org chart)의 직원**처럼 — 역할·보고라인·**예산**·**하트비트**·거버넌스. 티켓/이슈로 지시.
- **감사 로그:** mutating action, heartbeat 상태변화, cost event, approval, comment, work product가 **durable activity로 기록, 모든 요청이 actor에 추적됨** (immutable audit).
- **스택:** Node.js 20+/pnpm, **로컬은 임베디드 Postgres**(프로덕션은 외부 Postgres), API 서버 **localhost:3100**. `npx paperclipai onboard` 또는 clone+`pnpm dev`. **셀프호스트=로컬 가능.**
- **인증:** 로컬 loopback 신뢰 모드 / 인증 모드(`--bind lan|tailnet`). 에이전트는 **API 키 + 단명 run JWT**.

### 왜 우리한테 큰가 (테제 정합)
| Paperclip | Orbit Station |
|---|---|
| 에이전트 조직도(역할·팀·보고라인) | 플랫폼·아바타 (Nova=분석가…) |
| **durable activity 로그 / 풀 트레이싱** | ← 우리 **이벤트 소스** 그 자체 |
| 로컬 셀프호스트(Node) | ← **로컬-퍼스트** 딱 |
| "zero-human company" 마케팅 | ← **InKoEx 테제 그대로** |

CrewAI(라이브러리)보다 **제품 은유가 더 잘 맞는다.** 조직·예산·거버넌스가 이미 있음.

## 2. 통합 지점 (확인된 기술 사실)

- **REST API 존재.** localhost:3100, 예: `GET /api/issues/:id` (에이전트가 `PAPERCLIP_API_KEY`로 태스크 상세 조회). 전체 activity-feed 엔드포인트는 이 페이지들엔 미기재 — 전체 인덱스는 `mintlify.com/paperclipai/paperclip/llms.txt`.
- **어댑터 계약이 공개됨** (`@paperclipai/adapter-utils`):
  ```ts
  execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult>
  // ctx: runId, agent 메타, taskId, wakeReason, issueIds (thin) 또는 fat context
  // result: exitCode, UsageSummary(토큰), cost(provider/model/costUsd), sessionId, resultJson, summary
  // onLog(stream:'stdout'|'stderr', chunk) 콜백으로 로그 스트림
  ```
  에이전트 종류: Claude Code, Codex, CLI(Cursor/Gemini/bash), HTTP/webhook 봇(OpenClaw).
- **트리거는 하트비트**(DB 백드 wakeup 큐, 최소 30초 스케줄) — **이벤트 기반 실시간 push 아님.**
- **아웃바운드 웹훅 없음** (기능요청 이슈 #1790, #2897). websocket/SSE 미기재.

### 세 가지 탭 방식 (덜 취약한 순, Codex 순위 + 내 보정)
| 방식 | 어떻게 | 평가 |
|---|---|---|
| **(A) API 폴링 인제스터** | 사이드카가 localhost:3100 activity API를 주기 폴링 → 중립 workEvents 변환 → Convex | **기본값.** 로컬 단일사용자면 1~5s 레이턴시 충분. 중복=`source+externalId` idempotency, 순서=`sequence` 또는 `sourceTimestamp+ingestSeq`, 재시작 누락=cursor backfill. 부하는 옛 1초-틱 대비 무시 가능 |
| **(B) 커스텀 어댑터로 tee** | `execute(ctx)`를 구현한 어댑터가 실제 에이전트(Claude Code/스크립트)를 위임 실행 + 우리 Convex로도 이벤트 emit | ★ **보정: 어댑터는 공개 계약이라 "내부 결합"이 아니라 일급 확장점.** run 생명주기·툴콜(onLog)·산출물(resultJson)을 소스에서 실시간 획득. 단 adapter별 lifecycle과 조화 필요 |
| ~~(C) DB 직접 읽기~~ | 임베디드 Postgres 직접 | **금지.** 신생이라 스키마 churn↑, immutable log 저장형태·migration·ordering이 외부 계약 아님. Paperclip이 아니라 Paperclip 내부 구현에 종속됨 |

**권고 조합:** (A) 폴링을 뼈대로, (B) 커스텀 어댑터로 실시간 툴콜·artifact 보강. (C)는 버리는 프로토타입 외 금지.

## 3. Codex 전략 교차검증 (요지)

1. **CrewAI→Paperclip 전면교체? 부분동의.** Paperclip은 "작업 레이어 운영 셸"로 강함. 하지만 **durable activity log ≠ durable workflow runtime** — LangGraph급 HITL·체크포인트·분기·재개 요구가 Paperclip으로 자동 해결된다 가정하면 위험. 그건 **별도 트리거로 남겨라.** 그리고 Convex 이벤트 계약·아바타 행동 매핑·artifact UX·Frozen 전시는 **여전히 우리 자산.**
2. **통합: API 폴링 우선, DB 직접 금지.** (위 표와 일치.)
3. **개인용 로컬이면 과한가? 부분동의.** "프레젠테이션 가설 검증"만이면 Paperclip 없이 `cmux/스크립트 → Convex pushEvent → 아바타`로 충분. "내 로컬 AI 조직을 실제로 운영"이 목적이면 Paperclip이 "플랫폼을 사는" 값어치.
4. **이벤트 계약을 Paperclip 스키마에 맞추나? 반대.** 중립 계약 유지 (기존 결정과 일치). Paperclip 원본 JSON은 `raw`로 저장하되 UI는 절대 raw 스키마 의존 금지. 최소 의미 단위: `run_started, task_assigned, agent_message, tool_call_started/finished, decision_recorded, artifact_created, status_changed, run_finished` + `source, externalId, externalRunId, sourceTimestamp, ingestedAt, sequence, raw`.
5. **놓친 리스크:** ① 70k stars를 성숙도로 착각 금지(4개월, API/스키마/업그레이드/백업/auth 흔들릴 수 있음) ② **Paperclip이 이미 React 관리 UI를 가짐 → Orbit Station 차별점을 날카롭게.** Orbit = "관리 콘솔"이 아니라 "팀 리듬·산출물 흐름을 한 화면에서 읽는 전시."

## 4. 결정 권고 — 2단계 검증 (Codex 최종안 채택)

**전면 교체 아님. 중립 계약 먼저, Paperclip은 소스 하나.**

1. **Phase A — 중립 계약 + 직접 emitter로 첫 슬라이스.**
   `workEvents` 스키마(§3.4) 정의 → 가짜 제너레이터 또는 cmux/스크립트가 직접 Convex에 이벤트 push → 아바타 연기 + artifact 클릭 역추적. **여기서 06-27 가설("팀 리듬이 한 화면에서 읽히나") 검증.** Paperclip 없이.
2. **Phase B — Paperclip을 소스 어댑터로 추가.**
   같은 UI가 Paperclip 실사건으로 그대로 움직이는지 확인. (A)폴링 인제스터 + (B)커스텀 어댑터. **좋으면 CrewAI 슬라이스 생략, 별로면 손실은 어댑터 하나로 제한.**

이 순서의 이점: **아바타/Convex/계약 자산은 Paperclip 채택 여부와 무관하게 남는다.**

## 5. 열린 질문 (다음에 확인)
- [ ] Paperclip **activity 읽기 API**의 실제 엔드포인트·스키마·페이지네이션 (llms.txt 전체 문서 확인)
- [ ] activity에 **단조 증가 sequence/cursor**가 있나 (폴링 idempotency·순서 보장 핵심)
- [ ] 커스텀 어댑터가 **부작용(우리 Convex emit)** 을 넣어도 안전한가 (재시도·취소 시 중복 이벤트?)
- [ ] Paperclip UI vs Orbit 프레젠테이션 **책임 경계** — Orbit이 더 잘 보여주는 것은 정확히 무엇?
- [ ] 성숙도/업그레이드 경로 — 로컬 버전 핀 고정 전략

## 출처
- [Paperclip 공식](https://paperclip.ing/) · [GitHub README](https://github.com/paperclipai/paperclip/blob/master/README.md) · [Agent Integration 문서](https://paperclipai-paperclip.mintlify.app/agents/overview)
- [아웃바운드 웹훅 이슈 #1790](https://github.com/paperclipai/paperclip/issues/1790) · [#2897](https://github.com/paperclipai/paperclip/issues/2897)
