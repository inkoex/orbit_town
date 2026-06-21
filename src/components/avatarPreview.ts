import { characters } from '../../data/characters';

export function getAvatarPreviewLayout(characterName: string, scale = 2) {
  const character = characters.find((candidate) => candidate.name === characterName);
  if (!character) return undefined;

  const frames = Object.values(character.spritesheetData.frames);
  const frame = character.spritesheetData.frames.down?.frame ?? frames[0]?.frame;
  if (!frame) return undefined;

  const atlasFrames = characters
    .filter((candidate) => candidate.textureUrl === character.textureUrl)
    .flatMap((candidate) => Object.values(candidate.spritesheetData.frames));
  const atlasWidth = Math.max(...atlasFrames.map(({ frame }) => frame.x + frame.w));
  const atlasHeight = Math.max(...atlasFrames.map(({ frame }) => frame.y + frame.h));

  return {
    textureUrl: character.textureUrl,
    width: frame.w * scale,
    height: frame.h * scale,
    backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
    backgroundSize: `${atlasWidth * scale}px ${atlasHeight * scale}px`,
  };
}
