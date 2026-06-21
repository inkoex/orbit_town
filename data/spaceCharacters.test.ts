import { spaceCharacters } from './spaceCharacters';

describe('spaceCharacters', () => {
  test('uses intact front-facing frames until directional art is replaced', () => {
    for (const character of spaceCharacters) {
      const { animations } = character.spritesheetData;
      expect(animations?.left).toEqual(['down', 'down2', 'down3']);
      expect(animations?.right).toEqual(['down', 'down2', 'down3']);
      expect(animations?.up).toEqual(['down', 'down2', 'down3']);
      expect(animations?.down).toEqual(['down', 'down2', 'down3']);
    }
  });
});
