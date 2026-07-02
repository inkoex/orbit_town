# 작업 레이어 스택 결정 — CrewAI 먼저, LangGraph는 "계획된 이주"

> **2026-07-02 · 상태: 결정됨 (사용자 동의)**
> 근거: 사용자 CrewAI 강의 소견("분기 복잡하면 LangGraph") + 2026-07 시장 확인(Claude 웹 검증) — 두 평가 일치.
> 관련: `2026-07-01-conversation-vs-work-layer.md`(왜 작업 레이어인가) · `2026-07-02-avatar-system-plan.md` 부록 A(전시 레이어와의 접합) · `~/.claude` 메모리 `project-orbit-work-layer-architecture`

## 결정 한 문장

**오래가는 자산은 프레임워크가 아니라 이벤트 계약(오케스트레이터 → `workEvents` → Convex → 아바타)이다. 그 계약 뒤의 엔진으로 CrewAI를 먼저 끼우고, 트리거가 오면 LangGraph로 갈아끼운다.**

## 스택 배치 (3층 구조 재확인)

| 층 | 담당 | 결정 |
|---|---|---|
| A. 오케스트레이션 두뇌 | 지시 분배·에이전트 실행·handoff·수렴 | **CrewAI (슬라이스 1~2)** → 트리거 시 **LangGraph** |
| B. durable 런타임 | 장기 실행·재시도·크래시 생존 | Temporal/Inngest — A 선택과 직교, 잡이 길어지면 그때 |
| C. 접수 + 척추 + 시각화 | 지시 큐·이벤트 저장·reactive 아바타 | **Convex** (기존) |

## 왜 CrewAI 먼저인가

1. 슬라이스 1의 목적은 오케스트레이션 정교함이 아니라 **"계약(seam) + 가독성 가설" 검증** — 최속 엔진이 이긴다 (CrewAI = 2~4시간 프로토 수준, 2026 시장 컨센서스).
2. 사용자 학습 모멘텀이 CrewAI (강의 진행 중).
3. 역할/크루 은유가 아바타 페르소나와 1:1.

2026-07 기준 상태: CrewAI v1.10+ (MCP·A2A 네이티브, 일 1,200만 실행). 알려진 한계 = 체크포인팅 없음, 에이전트 간 직접 메시징 없음(task 출력 경유), 에러 핸들링 거침.

## 철칙 2개 (이주 비용을 0에 가깝게 유지)

1. **이벤트 계약을 프레임워크 중립으로 먼저 정의.** CrewAI 콜백이든 LangGraph `astream_events`든 **같은 `workEvents` 스키마**로 흘러들게 — 어댑터만 교체하는 구조.
2. **crew 안에 분기·상태 로직을 욱여넣지 말 것.** 복잡해지기 시작하면 프레임워크와 싸우지 말고 이주 신호로 읽는다.

## LangGraph 이주 트리거 (하나라도 치면 이사)

1. 조건 분기가 계층 위임(hierarchical process)으로 표현 안 될 때
2. **중단/재개·휴먼 승인(HITL)** 필요 — 예: 트레이드 실행 전 사람 컨펌
3. 체크포인트/장기 실행 안정성 필요
4. 에러 핸들링 세분화 필요

**전망 (기록해두는 정직한 예상):** 네오트라 트레이딩 운영은 시장 분기·모니터링 루프·재시도·거래 승인 때문에 이 트리거를 **빨리** 칠 것. 즉 현실적 그림 = *CrewAI는 슬라이스 1~2의 학습 겸 검증 엔진, LangGraph가 네오트라 실전의 본선 엔진.* LangGraph 0.4(2026-04)의 지속성·HITL 체크포인트가 그 요구에 정확히 대응.

## 기각한 제3 선택지 (사유 기록)

- **OpenAI Agents SDK**: handoff는 깔끔하나 팀-오브-에이전트 패턴에 얇음.
- **AutoGen/AG2**: MS Agent Framework로 통합 진행 중 — 기반 churn, 베이스로 부적합.
- **무프레임워크(순수 코드+LiteLLM)**: 슬라이스 1만 보면 가능하나, 팀 확장 로드맵 + 학습 투자 대비 프레임워크가 남는 장사.
- **Temporal/Inngest**: 기각이 아니라 B층으로 연기 (직교).

## 첫 슬라이스 정의 (변경 없음, 재확인)

**지시 1개 → 2에이전트 협업 → artifact 1개 → 아바타가 그 사건을 연기.**

- 순서: ① 이벤트 계약(`workAgents`/`workEvents`/`artifacts` 스키마 + 아바타 행동 매핑) → ② **가짜 제너레이터**로 화면 검증 (Convex write 최소, 프론트 리스크 0) → ③ CrewAI 어댑터로 교체(step callback → `pushEvent`) → ④ AI Town의 `agentGenerateMessage` LLM 잡담 루프는 이 시점에 불필요해짐.
- 여기서 06-27 핵심 가설("팀 상태·리듬이 텍스트보다 한 화면에서 잘 읽히나") 첫 검증.

## 다음 할 일

- [ ] **이벤트 계약 설계 (30분 세션):** `workEvents` 스키마(타입: task_start/message/artifact/…, 서버 타임스탬프+duration), 아바타 행동 매핑(작업→장소 이동, 협업→다리 조우, 산출물→클릭 역추적), CrewAI 콜백 ↔ LangGraph 이벤트 양쪽에서 채울 수 있는지 교차 확인.
- [ ] 가짜 제너레이터 슬라이스 → CrewAI 교체.

## 출처 (2026-07-02 확인)

- [gurusup — Best Multi-Agent Frameworks 2026](https://gurusup.com/blog/best-multi-agent-frameworks-2026)
- [PE Collective — LangGraph vs CrewAI vs AutoGen (2026)](https://pecollective.com/blog/ai-agent-frameworks-compared/) — "CrewAI 프로토 → LangGraph 이주"가 정형 패턴
- [Leanware — LangGraph vs CrewAI](https://leanware.co/insights/langgraph-vs-crewai-comparison)
- [LangChain — LangGraph](https://www.langchain.com/langgraph) · [Langfuse — CrewAI 관측](https://langfuse.com/docs/integrations/crewai)
