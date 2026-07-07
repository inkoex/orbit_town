import { readFileSync } from 'node:fs';
import {
  ACTING_TTL_MS,
  deriveStageDirections,
  pacingPose,
  WorkEventLike,
} from './acting';

// M002 대본을 "재생된 이벤트 배열"로 변환 — 재생기의 envelope 채우기와 동일 규칙.
type ScriptEntry = { delay: number; agentName?: string; type: string; summary: string };
const doc = JSON.parse(readFileSync('scripts/workevents/m002.json', 'utf8')) as {
  runPrefix: string;
  script: ScriptEntry[];
};

// t0 기준으로 delay를 누적해 sourceTimestamp를 만든다.
function replayedEvents(t0: number, upTo?: number): WorkEventLike[] {
  let t = t0;
  const out: WorkEventLike[] = [];
  doc.script.forEach((e, i) => {
    t += e.delay * 1000;
    if (upTo !== undefined && i + 1 > upTo) return;
    out.push({
      sequence: i + 1,
      type: e.type,
      summary: e.summary,
      ...(e.agentName !== undefined ? { agentName: e.agentName } : {}),
      externalRunId: `${doc.runPrefix}-r1`,
      sourceTimestamp: t,
    });
  });
  return out;
}

describe('deriveStageDirections — M002 대본 기준', () => {
  const T0 = 1_000_000;

  test('9번(Vega 렌더 완료)까지: Atlas·Nova·Vega 전원 working', () => {
    const events = replayedEvents(T0, 9);
    const now = events[events.length - 1].sourceTimestamp! + 1000;
    const d = deriveStageDirections(events, now);
    expect(d.get('atlas')?.kind).toBe('working');
    expect(d.get('nova')?.kind).toBe('working');
    expect(d.get('vega')?.kind).toBe('working');
    expect(d.get('vega')?.summary).toContain('orbit-launch.mp4');
  });

  test('10번(decision_recorded, SYS) 후: 직전 연기자 Vega가 awaiting_approval', () => {
    const events = replayedEvents(T0, 10);
    const now = events[events.length - 1].sourceTimestamp! + 1000;
    const d = deriveStageDirections(events, now);
    expect(d.get('vega')?.kind).toBe('awaiting_approval');
    expect(d.get('vega')?.summary).toContain('승인 대기');
    // 다른 아바타는 영향 없음
    expect(d.get('nova')?.kind).toBe('working');
  });

  test('12번(run_finished) 후: Atlas 해제, Vega는 최신이 11번이라 working 유지', () => {
    const events = replayedEvents(T0, 12);
    const now = events[events.length - 1].sourceTimestamp! + 1000;
    const d = deriveStageDirections(events, now);
    expect(d.has('atlas')).toBe(false);
    expect(d.get('vega')?.kind).toBe('working'); // 11번 status_changed
  });

  test('TTL 90초 경과: 전원 해제', () => {
    const events = replayedEvents(T0, 12);
    const now = events[events.length - 1].sourceTimestamp! + ACTING_TTL_MS + 1;
    const d = deriveStageDirections(events, now);
    expect(d.size).toBe(0);
  });

  test('이벤트 없음 → 빈 맵', () => {
    expect(deriveStageDirections([], T0).size).toBe(0);
  });
});

describe('pacingPose — 절대시간 결정론', () => {
  test('같은 (name, now)는 항상 같은 포즈', () => {
    expect(pacingPose('Vega', 123_456)).toEqual(pacingPose('Vega', 123_456));
  });

  test('오프셋은 ±1타일 안에서 왕복하고 speed는 양수', () => {
    for (let t = 0; t <= 12_000; t += 500) {
      const p = pacingPose('Vega', t);
      expect(Math.abs(p.offsetX)).toBeLessThanOrEqual(1);
      expect(p.speed).toBeGreaterThan(0);
      expect([1, -1]).toContain(p.facing.dx);
      expect(p.facing.dy).toBe(0);
    }
  });

  test('반주기(3초) 간격으로 진행 방향이 반전된다', () => {
    const a = pacingPose('Vega', 0);
    const b = pacingPose('Vega', 3000);
    expect(a.facing.dx).toBe(-b.facing.dx);
  });

  test('이름이 다르면 위상이 달라 같은 시각에 같은 걸음이 아니다', () => {
    const names = ['Vega', 'Nova', 'Atlas', 'Orion', 'Iris'];
    const poses = names.map((n) => pacingPose(n, 50_000).offsetX);
    expect(new Set(poses.map((v) => v.toFixed(3))).size).toBeGreaterThan(1);
  });
});
