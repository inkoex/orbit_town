import fs from 'fs';
import path from 'path';
import {
  ISO_OBJECTS,
  ISO_CHARACTER_FRAMES,
  ISO_DIRECTIONS,
  CHARACTER_FOOT_ANCHOR,
} from './isoSliceManifest';

const PUBLIC = path.join(process.cwd(), 'public');
const resolve = (src: string) => path.join(PUBLIC, src.replace('/ai-town/', ''));

describe('iso slice manifest', () => {
  test('every object texture exists on disk', () => {
    for (const asset of Object.values(ISO_OBJECTS)) {
      expect(fs.existsSync(resolve(asset.src))).toBe(true);
    }
  });

  test('each of the 4 directions has idle + 4 walk frames, all existing', () => {
    expect([...ISO_DIRECTIONS].sort()).toEqual(['ne', 'nw', 'se', 'sw']);
    for (const dir of ISO_DIRECTIONS) {
      const frames = ISO_CHARACTER_FRAMES[dir];
      expect(frames.walk).toHaveLength(4);
      for (const src of [frames.idle, ...frames.walk]) {
        expect(fs.existsSync(resolve(src))).toBe(true);
      }
    }
  });

  test('all anchors are normalized to 0..1', () => {
    const anchors = [CHARACTER_FOOT_ANCHOR, ...Object.values(ISO_OBJECTS).map((o) => o.anchor)];
    for (const a of anchors) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(1);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(1);
    }
  });
});
