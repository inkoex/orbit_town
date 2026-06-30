import fs from 'fs';
import path from 'path';
import {
  ISO_OBJECTS,
  ISO_CHARACTER_FRAMES,
  ISO_DIRECTIONS,
  CHARACTER_FOOT_ANCHOR,
  resolveAvatarFrames,
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

describe('resolveAvatarFrames', () => {
  test('등록된 아바타는 그 아바타 폴더 경로를 돌려준다', () => {
    const frames = resolveAvatarFrames('iso-agent');
    expect(frames.se.idle).toContain('/iso-slice/iso-agent/');
    expect(frames.se.walk).toHaveLength(4);
    expect(frames.se.walk[2]).toContain('character-se-walk-2.png');
  });

  test('네 방향이 모두 있고 파일이 디스크에 존재한다', () => {
    const frames = resolveAvatarFrames('iso-agent');
    for (const d of ISO_DIRECTIONS) {
      expect(frames[d].idle).toContain(`character-${d}-idle.png`);
      for (const src of [frames[d].idle, ...frames[d].walk]) {
        expect(fs.existsSync(resolve(src))).toBe(true);
      }
    }
  });

  test('미등록 아바타는 기본(fallback) 프레임으로 떨어진다', () => {
    expect(resolveAvatarFrames('does-not-exist')).toBe(ISO_CHARACTER_FRAMES);
  });

  test('avatarId가 없으면 기본 프레임을 쓴다', () => {
    expect(resolveAvatarFrames(undefined)).toBe(ISO_CHARACTER_FRAMES);
  });
});
