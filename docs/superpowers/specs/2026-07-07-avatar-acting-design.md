# 아바타 최소 연기 (슬라이스 ②a) — 설계

날짜: 2026-07-07
상태: 설계 확정 (유저 승인), 구현 전
선행: `2026-07-07-fake-workevents-generator-design.md` (M002 재생기 — 이 연기의 입력·테스트 도구), `docs/design/2026-07-02-avatar-system-plan.md` 부록 A (Frozen-전시 안무 아키텍처)

## 목적

빌보드 티커에만 흐르던 workEvents를 **아바타 몸짓으로** 번역한다 — "전광판은 승인 대기인데 아바타는 gardening"인 간극을 없앤다.
**제자리 연기만** (유저 확정): 하이라이트 + 작업 말풍선 + 서성임 + 승인 대기 부동자세. 장소 이동·핸드오프 걸어가기·walkable 그래프·전용 포즈는 ②b.

제약 (유저 확정 + 부록 A):
- **기존 인게임 로스터만** — Kenney 5(iso-agent-*) + 이미 베이크된 Lyra(robot-analyst). 새 아바타 제작 0, 새 그림 0장. 연기 레이어는 `avatarId`를 구분하지 않는다(Asset Contract).
- **클라이언트 전용** — 서버/Convex 변경 0, write 0. 월드 Frozen 유지.
- **절대시간 결정론** — 멀티탭 동일 장면, 프레임 적분 금지(부록 A 함정 3).
- **서버 상태와 혼입 금지** — 오버라이드는 렌더 직전 Player에서만(부록 A VisualAgent 원칙).

## 구조

```
[PixiGame]  useQuery(api.workEvents.list, { count: 20 })   ← 기존 구독, count 4→20
     │        (티커와 연기가 같은 데이터를 공유)
     ▼
[acting.ts]  안무가 — 순수 함수 (신규, src/components/isometric/acting.ts)
     │        deriveStageDirections(events, now) → Map<lowercased name, StageDirection>
     │        StageDirection = { kind: 'working' | 'awaiting_approval';
     │                           summary: string; since: number }
     │        pacingOffset(name, now) → { dx: -1|0|1 (타일), facing, speed }
     ▼
[Player.tsx]  iso 분기에서 내 이름의 지시가 있으면 오버라이드:
              bubble → ⚙/⏸ + summary (기존 SpeechBubble 재사용)
              activeState → 'active' (기존 하이라이트 재사용)
              position/facing/speed → pacingOffset 적용 (working일 때만; awaiting은 정지)
```

## 연기 규칙

**매칭** — `event.agentName`(소문자화) == 아바타 이름(소문자화). 이름 없는 이벤트는 승인 규칙만.

**아바타별 상태 = 그 아바타의 최신 이벤트 하나** (sequence 내림차순 첫 매치):

| 최신 이벤트 타입 | 지시 |
|---|---|
| `run_started` `task_assigned` `tool_call_started` `tool_call_finished` `agent_message` `artifact_created` `status_changed` | `working` (②a에선 세분화 없음) |
| `run_finished` | 해제 (유휴 복귀) |
| `decision_recorded` (SYS) | `awaiting_approval` — 같은 `externalRunId`에서 **직전에 연기하던(agentName 있는 최신) 아바타**에게 귀속 |

**TTL 90초** — 아바타의 최신 이벤트 시각(sourceTimestamp, 없으면 `_creationTime`)에서 90초 경과 시 해제. 재생기가 죽어도 영원히 일하는 척 금지. `run_finished`는 즉시.

**서성임 (working일 때)** — 정지 위치 중심 x축 ±1타일 왕복. 절대시간 슬롯: 주기 6초(3초마다 방향 전환), 위상은 `hash(agentName)`으로 어긋나게(전원 동기화 행진 방지). 반환 오프셋을 렌더 좌표에 더한다 — 서버 위치 데이터는 불변. `speed > 0`이면 기존 IsoCharacter가 걷기 애니 재생. `awaiting_approval`은 오프셋 0·speed 0(부동자세).

**말풍선 우선순위** — 타이핑 `···` > **연기(⚙ working / ⏸ awaiting)** > 유휴 활동 이모지. 연기 말풍선 텍스트 = `⚙ ` or `⏸ ` + `truncateBubbleText(summary, 24)` (기존 유틸).

## 검증

1. **jest (acting.test.ts)** — M002 대본(scripts/workevents/m002.json)을 이벤트 배열로 변환해 먹인다:
   - 9번 이벤트(Vega 렌더 완료)까지 재생 시점 → Vega=working, Nova=working(자기 최신이 agent_message), Atlas=working
   - 10번(decision_recorded) 후 → **Vega=awaiting_approval** (직전 연기자 귀속)
   - 12번(run_finished) 후 → Atlas 해제; TTL 90초 경과 → 전원 해제
   - pacingOffset 결정론: 같은 (name, now) → 같은 값; 6초 주기로 방향 반전; awaiting은 0
2. **실전 (브라우저 실증)** — 재생기 켜고 Playwright 스크린샷: Vega가 ⚙ 말풍선+서성임(두 샷에서 위치 다름), ⏸ 장면에서 정지+말풍선.

## 비목표 (②b 이후)

장소 이동/출근, 핸드오프 걸어가기, walkable waypoint 그래프, 타입별 전용 포즈·이펙트, 유휴 전시 안무(0a)·구독 절단(별개 비용 실타래).
