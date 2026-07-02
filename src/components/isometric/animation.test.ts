import {
  bobOffset,
  cycleIndex,
  flowFractions,
  oscillate01,
  pulseValue,
  remapClamped,
} from './animation';

describe('oscillate01', () => {
  it('stays within [0, 1]', () => {
    for (let t = 0; t < 5000; t += 137) {
      const v = oscillate01(t, 1000);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('starts at the midpoint and rises', () => {
    expect(oscillate01(0, 1000)).toBeCloseTo(0.5, 6);
    expect(oscillate01(250, 1000)).toBeCloseTo(1, 6); // quarter period → peak
    expect(oscillate01(750, 1000)).toBeCloseTo(0, 6); // three-quarter → trough
  });

  it('is periodic', () => {
    expect(oscillate01(123, 1000)).toBeCloseTo(oscillate01(123 + 1000, 1000), 6);
  });

  it('phase shifts the waveform', () => {
    // phase 0.25 advances a full quarter period.
    expect(oscillate01(0, 1000, 0.25)).toBeCloseTo(oscillate01(250, 1000), 6);
  });
});

describe('bobOffset', () => {
  it('swings symmetrically around zero within ±amplitude', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let t = 0; t < 6000; t += 50) {
      const v = bobOffset(t, 6000, 14);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(max).toBeCloseTo(14, 1);
    expect(min).toBeCloseTo(-14, 1);
  });

  it('is zero at t=0', () => {
    expect(bobOffset(0, 6000, 14)).toBeCloseTo(0, 6);
  });
});

describe('pulseValue', () => {
  it('maps the oscillation into [min, max]', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let t = 0; t < 4000; t += 31) {
      const v = pulseValue(t, 3200, 0.55, 1);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeCloseTo(0.55, 2);
    expect(max).toBeCloseTo(1, 2);
  });

  it('sits at the midpoint of [min, max] at t=0', () => {
    expect(pulseValue(0, 3200, 0.5, 1)).toBeCloseTo(0.75, 6);
  });
});

describe('flowFractions', () => {
  it('returns `count` markers, all within [0, 1)', () => {
    for (let t = 0; t < 4000; t += 53) {
      const fracs = flowFractions(t, 2000, 5);
      expect(fracs).toHaveLength(5);
      for (const f of fracs) {
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThan(1);
      }
    }
  });

  it('spaces markers evenly at t=0', () => {
    expect(flowFractions(0, 2000, 4)).toEqual([0, 0.25, 0.5, 0.75]);
  });

  it('drifts the whole set forward over time', () => {
    const a = flowFractions(0, 2000, 4);
    const b = flowFractions(500, 2000, 4); // quarter period → +0.25
    expect(b[0]).toBeCloseTo(0.25, 6);
    expect(b[1]).toBeCloseTo(a[1] + 0.25, 6);
  });

  it('wraps cleanly across the period boundary', () => {
    expect(flowFractions(2000, 2000, 4)).toEqual(flowFractions(0, 2000, 4));
  });
});

describe('cycleIndex', () => {
  it('steps through indices on each interval and wraps', () => {
    expect(cycleIndex(0, 2000, 3)).toBe(0);
    expect(cycleIndex(1999, 2000, 3)).toBe(0);
    expect(cycleIndex(2000, 2000, 3)).toBe(1);
    expect(cycleIndex(4000, 2000, 3)).toBe(2);
    expect(cycleIndex(6000, 2000, 3)).toBe(0); // wraps back
  });
});

describe('remapClamped', () => {
  it('maps linearly inside the range', () => {
    expect(remapClamped(0.5, 0, 1, 0, 100)).toBeCloseTo(50);
    expect(remapClamped(0.61, 0.32, 0.9, 0.35, 0.06)).toBeCloseTo(0.205);
  });

  it('clamps outside the input range', () => {
    expect(remapClamped(-5, 0, 1, 0.35, 0.06)).toBeCloseTo(0.35);
    expect(remapClamped(99, 0, 1, 0.35, 0.06)).toBeCloseTo(0.06);
  });
});
