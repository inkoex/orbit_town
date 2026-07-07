// Pure, Vite-free (Jest-safe) — activeState.ts와 같은 규칙.
// 안무가: workEvents 스트림을 아바타별 "무대지시"로 번역한다 (슬라이스 ②a).
// 스펙: docs/superpowers/specs/2026-07-07-avatar-acting-design.md
// - 아바타 상태 = 그 아바타의 최신 이벤트 하나 (sequence 내림차순 첫 매치)
// - decision_recorded(SYS)는 같은 run에서 직전에 연기하던 아바타에게 귀속
// - run_finished는 즉시 해제, 그 외는 TTL 90초
// - 서성임 포즈는 (name, now)만의 함수 — 절대시간 결정론(멀티탭 동일)

export type StageDirection = {
  kind: 'working' | 'awaiting_approval';
  summary: string;
  since: number;
};

export type WorkEventLike = {
  sequence: number;
  type: string;
  summary: string;
  agentName?: string;
  externalRunId?: string;
  sourceTimestamp?: number;
  _creationTime?: number;
};

export const ACTING_TTL_MS = 90_000;

const eventTime = (e: WorkEventLike) => e.sourceTimestamp ?? e._creationTime ?? 0;

export function deriveStageDirections(
  events: WorkEventLike[],
  now: number,
): Map<string, StageDirection> {
  const sorted = [...events].sort((a, b) => b.sequence - a.sequence);
  const directions = new Map<string, StageDirection>();
  const settled = new Set<string>(); // 이미 최신 상태가 정해진 아바타 (해제 포함)

  for (const e of sorted) {
    if (e.type === 'decision_recorded' && e.agentName === undefined) {
      // 같은 run에서 이 결정보다 앞선, 이름 있는 최신 이벤트의 주인공이 대기한다.
      const target = sorted.find(
        (p) =>
          p.sequence < e.sequence &&
          p.agentName !== undefined &&
          p.externalRunId === e.externalRunId,
      )?.agentName;
      if (target === undefined) continue;
      const key = target.toLowerCase();
      if (settled.has(key)) continue;
      settled.add(key);
      // TTL 면제: 승인 대기는 "사람이 결정할 때까지"가 본질 — working의 TTL은
      // 죽은 소스 정리용이지만, 대기는 오래될수록 오히려 보여야 할 정보다.
      directions.set(key, { kind: 'awaiting_approval', summary: e.summary, since: eventTime(e) });
      continue;
    }
    if (e.agentName === undefined) continue;
    const key = e.agentName.toLowerCase();
    if (settled.has(key)) continue;
    settled.add(key);
    if (e.type === 'run_finished') continue; // 즉시 해제
    if (now - eventTime(e) > ACTING_TTL_MS) continue; // TTL 만료
    directions.set(key, { kind: 'working', summary: e.summary, since: eventTime(e) });
  }
  return directions;
}

// ---- 서성임(pacing) v2: 걷고-서고 리듬 ----
// v1(쉼 없는 삼각파 ±1타일)은 "배회"로 읽혔다(유저: 부산스럽다). 진짜 서성임은
// 걷기→멈춤의 리듬: 10초 주기 4구간 — +x 걷기(1.8s) / 서기(3.2s) / -x 걷기(1.8s)
// / 서기(3.2s), 진폭 0.5타일. 서 있는 시간 64% = "책상 앞에서 가끔 들썩".
// 위상은 이름 해시로 어긋나게(동기화 행진 방지). 여전히 (name, now)만의 함수.
const PACING_WALK_MS = 1800;
const PACING_DWELL_MS = 3200;
const PACING_PERIOD_MS = 2 * (PACING_WALK_MS + PACING_DWELL_MS); // 10_000
const PACING_AMPLITUDE_TILES = 0.5;

function nameHash(name: string): number {
  return Math.abs([...name].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
}

export function pacingPose(
  name: string,
  now: number,
): { offsetX: number; facing: { dx: number; dy: number }; speed: number } {
  const phase = nameHash(name) % PACING_PERIOD_MS;
  const t = (now + phase) % PACING_PERIOD_MS;
  const A = PACING_AMPLITUDE_TILES;
  if (t < PACING_WALK_MS) {
    // +x로 걷는 중: 0 → A
    return { offsetX: (t / PACING_WALK_MS) * A, facing: { dx: 1, dy: 0 }, speed: 1 };
  }
  if (t < PACING_WALK_MS + PACING_DWELL_MS) {
    // 먼 끝에서 서기 (직전 진행 방향을 바라본 채)
    return { offsetX: A, facing: { dx: 1, dy: 0 }, speed: 0 };
  }
  if (t < PACING_WALK_MS + PACING_DWELL_MS + PACING_WALK_MS) {
    // -x로 돌아오는 중: A → 0
    const w = (t - PACING_WALK_MS - PACING_DWELL_MS) / PACING_WALK_MS;
    return { offsetX: (1 - w) * A, facing: { dx: -1, dy: 0 }, speed: 1 };
  }
  // 제자리에서 서기
  return { offsetX: 0, facing: { dx: -1, dy: 0 }, speed: 0 };
}
