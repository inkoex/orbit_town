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
});

describe('themeFromTileSetUrl', () => {
  test('returns space when URL has space-tiles', () => {
    expect(themeFromTileSetUrl('/ai-town/assets/space-tiles.png')).toBe('space');
  });

  test('returns folk otherwise', () => {
    expect(themeFromTileSetUrl('/ai-town/assets/gentle-obj.png')).toBe('folk');
  });
});
