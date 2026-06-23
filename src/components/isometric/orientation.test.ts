import { facingToIsoDirection, walkFrameAt } from './orientation';

describe('facingToIsoDirection', () => {
  test('maps world axes to iso directions', () => {
    expect(facingToIsoDirection({ dx: 1, dy: 0 })).toBe('se');
    expect(facingToIsoDirection({ dx: 0, dy: 1 })).toBe('sw');
    expect(facingToIsoDirection({ dx: -1, dy: 0 })).toBe('nw');
    expect(facingToIsoDirection({ dx: 0, dy: -1 })).toBe('ne');
  });

  test('zero facing falls back to se, or keeps the previous direction', () => {
    expect(facingToIsoDirection({ dx: 0, dy: 0 })).toBe('se');
    expect(facingToIsoDirection({ dx: 0, dy: 0 }, 'nw')).toBe('nw');
  });

  test('dominant axis wins on a diagonal', () => {
    expect(facingToIsoDirection({ dx: 0.9, dy: 0.2 })).toBe('se');
    expect(facingToIsoDirection({ dx: 0.2, dy: -0.9 })).toBe('ne');
  });
});

describe('walkFrameAt', () => {
  test('idle when not moving', () => {
    expect(walkFrameAt(0, 0)).toBe('idle');
    expect(walkFrameAt(12345, 0)).toBe('idle');
  });

  test('cycles walk-0..3 at 10fps while moving', () => {
    expect(walkFrameAt(0, 1)).toBe('walk-0');
    expect(walkFrameAt(100, 1)).toBe('walk-1');
    expect(walkFrameAt(200, 1)).toBe('walk-2');
    expect(walkFrameAt(300, 1)).toBe('walk-3');
    expect(walkFrameAt(400, 1)).toBe('walk-0');
  });
});
