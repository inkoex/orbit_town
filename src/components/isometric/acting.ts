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
      if (now - eventTime(e) > ACTING_TTL_MS) continue;
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

// ---- 서성임(pacing) ----
// 주기 6초 삼각파로 x축 ±1타일 왕복. 위상은 이름 해시로 어긋나게(동기화 행진 방지).
const PACING_PERIOD_MS = 6000;
const PACING_AMPLITUDE_TILES = 1;

function nameHash(name: string): number {
  return Math.abs([...name].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0));
}

export function pacingPose(
  name: string,
  now: number,
): { offsetX: number; facing: { dx: number; dy: number }; speed: number } {
  const phase = nameHash(name) % PACING_PERIOD_MS;
  const t = ((now + phase) % PACING_PERIOD_MS) / PACING_PERIOD_MS; // 0..1
  // 삼각파: 0→1(전반) / 1→0(후반). 전반은 +x로 걷는 중.
  const forward = t < 0.5;
  const tri = forward ? t * 2 : 2 - t * 2; // 0..1..0
  const offsetX = (tri * 2 - 1) * PACING_AMPLITUDE_TILES; // -1..+1
  return {
    offsetX,
    facing: { dx: forward ? 1 : -1, dy: 0 },
    speed: 1,
  };
}
