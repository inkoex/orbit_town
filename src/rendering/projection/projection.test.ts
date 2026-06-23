import { createIsoProjection } from './isoProjection';
import { createTopDownProjection } from './topDownProjection';

describe('createIsoProjection', () => {
  const iso = createIsoProjection({ tileWidth: 64, tileHeight: 32, originX: 320, originY: 16 });

  test('worldToScreen maps unit axes on a 2:1 diamond', () => {
    expect(iso.worldToScreen({ x: 1, y: 0 })).toEqual({ x: 352, y: 32 });
    expect(iso.worldToScreen({ x: 0, y: 1 })).toEqual({ x: 288, y: 32 });
  });

  test('screenToWorld inverts integer points', () => {
    expect(iso.screenToWorld(iso.worldToScreen({ x: 4, y: 7 }))).toEqual({ x: 4, y: 7 });
  });

  test('fractional round-trip is stable', () => {
    const p = { x: 3.25, y: 5.75 };
    const r = iso.screenToWorld(iso.worldToScreen(p));
    expect(r.x).toBeCloseTo(p.x);
    expect(r.y).toBeCloseTo(p.y);
  });

  test('worldToScreenCenter drops to tile center', () => {
    const base = iso.worldToScreen({ x: 0, y: 0 });
    const center = iso.worldToScreenCenter({ x: 0, y: 0 });
    expect(center).toEqual({ x: base.x, y: base.y + 16 });
  });

  test('viewportSize spans a 10x10 map', () => {
    expect(iso.viewportSize(10, 10)).toEqual({ width: 640, height: 320 });
  });
});

describe('createTopDownProjection', () => {
  const td = createTopDownProjection(32);

  test('worldToScreen scales by tileDim', () => {
    expect(td.worldToScreen({ x: 2, y: 3 })).toEqual({ x: 64, y: 96 });
  });

  test('worldToScreenCenter offsets by half a tile', () => {
    expect(td.worldToScreenCenter({ x: 0, y: 0 })).toEqual({ x: 16, y: 16 });
  });

  test('screenToWorld inverts', () => {
    expect(td.screenToWorld(td.worldToScreen({ x: 4, y: 7 }))).toEqual({ x: 4, y: 7 });
  });

  test('viewportSize scales both axes', () => {
    expect(td.viewportSize(10, 10)).toEqual({ width: 320, height: 320 });
  });
});
