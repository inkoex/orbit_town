import { readFileSync } from 'node:fs';
import { workEventType } from '../../convex/workEventsContract';
import { isoDescriptions } from '../../data/characters';

type ScriptEntry = {
  delay: number;
  agentName?: string;
  type: string;
  summary: string;
  payload?: unknown;
};

type ScriptDoc = {
  source: string;
  runPrefix: string;
  restSeconds: number;
  script: ScriptEntry[];
};

// jest cwd = 레포 루트
const doc = JSON.parse(readFileSync('scripts/workevents/m002.json', 'utf8')) as ScriptDoc;

// 계약 어휘를 validator 자체에서 추출 — 하드코딩 복제 금지 (스펙 §검증).
const vocab = (workEventType as { members?: Array<{ value?: unknown }> }).members?.map(
  (m) => m.value,
) as string[];

describe('m002 대본 — workEvents 계약 준수', () => {
  test('validator에서 어휘 추출이 동작한다', () => {
    expect(vocab).toBeDefined();
    expect(vocab).toHaveLength(9);
    expect(vocab).toContain('run_started');
  });

  test('문서 envelope 필드', () => {
    expect(doc.source).toBe('fake');
    expect(doc.runPrefix.length).toBeGreaterThan(0);
    expect(doc.restSeconds).toBeGreaterThan(0);
    expect(doc.script.length).toBeGreaterThan(0);
  });

  test('모든 항목이 계약을 지킨다', () => {
    const cast = new Set(isoDescriptions.map((d) => d.name));
    for (const e of doc.script) {
      expect(vocab).toContain(e.type);
      expect(typeof e.summary).toBe('string');
      expect(e.summary.length).toBeGreaterThan(0);
      expect(Number.isFinite(e.delay)).toBe(true);
      expect(e.delay).toBeGreaterThanOrEqual(0);
      if (e.agentName !== undefined) {
        expect(cast.has(e.agentName)).toBe(true);
      }
    }
  });

  test('미션 아크: run_started로 시작, run_finished로 끝', () => {
    expect(doc.script[0].type).toBe('run_started');
    expect(doc.script[doc.script.length - 1].type).toBe('run_finished');
  });
});
