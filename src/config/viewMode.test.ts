import { parseViewMode } from './viewMode';

describe('parseViewMode', () => {
  test('defaults to topdown for undefined or invalid input', () => {
    expect(parseViewMode(undefined)).toBe('topdown');
    expect(parseViewMode('')).toBe('topdown');
    expect(parseViewMode('garbage')).toBe('topdown');
    expect(parseViewMode('TopDown')).toBe('topdown');
  });

  test('returns iso only for exactly "iso"', () => {
    expect(parseViewMode('iso')).toBe('iso');
  });
});
