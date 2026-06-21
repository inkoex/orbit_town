import { spaceCharacters } from './spaceCharacters';

describe('spaceCharacters', () => {
  test('keeps space IDs while using validated folk placeholders', () => {
    expect(spaceCharacters.map(({ name }) => name)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6']);

    for (const [index, character] of spaceCharacters.entries()) {
      expect(character.textureUrl).toBe('/ai-town/assets/32x32folk.png');
      const { animations } = character.spritesheetData;
      expect(animations?.left).toEqual(['left', 'left2', 'left3']);
      expect(animations?.right).toEqual(['right', 'right2', 'right3']);
      expect(animations?.up).toEqual(['up', 'up2', 'up3']);
      expect(animations?.down).toEqual(['down', 'down2', 'down3']);
      expect(character.name).toBe(`s${index + 1}`);
    }
  });
});
