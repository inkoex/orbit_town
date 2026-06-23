import { resolveTheme, themeFromTileSetUrl } from './theme';

describe('resolveTheme', () => {
  test('defaults to folk when unset', () => {
    expect(resolveTheme(undefined)).toBe('folk');
  });

  test('returns space when set to space', () => {
    expect(resolveTheme('space')).toBe('space');
  });

  test('falls back to folk on unknown value', () => {
    expect(resolveTheme('banana')).toBe('folk');
  });

  test('returns iso-slice when set to iso-slice', () => {
    expect(resolveTheme('iso-slice')).toBe('iso-slice');
  });
});

describe('themeFromTileSetUrl', () => {
  test('returns space when URL has space-tiles', () => {
    expect(themeFromTileSetUrl('/ai-town/assets/space-tiles.png')).toBe('space');
  });

  test('returns iso-slice when URL has iso-slice', () => {
    expect(themeFromTileSetUrl('/ai-town/assets/iso-slice/floor-metal.png')).toBe('iso-slice');
  });

  test('returns folk otherwise', () => {
    expect(themeFromTileSetUrl('/ai-town/assets/gentle-obj.png')).toBe('folk');
  });
});
