import { Character } from './Character.tsx';
import { Graphics } from '@pixi/react';
import { orientationDegrees } from '../../convex/util/geometry.ts';
import { characters } from '../../data/characters.ts';
import { worldToScreenCenter } from '../utils/coords';
import { toast } from 'react-toastify';
import { Player as ServerPlayer } from '../../convex/aiTown/player.ts';
import { GameId } from '../../convex/aiTown/ids.ts';
import { Id } from '../../convex/_generated/dataModel';
import { Location, locationFields, playerLocation } from '../../convex/aiTown/location.ts';
import { useHistoricalValue } from '../hooks/useHistoricalValue.ts';
import { PlayerDescription } from '../../convex/aiTown/playerDescription.ts';
import { WorldMap } from '../../convex/aiTown/worldMap.ts';
import { ServerGame } from '../hooks/serverGame.ts';
import { ISO_DEBUG } from '../config/debug';
import { isoWorldToScreenCenter } from '../utils/isoCoords';

const PLAYER_COLORS = [0x22d3ee, 0x4ade80, 0xfbbf24, 0xf87171, 0xa78bfa, 0xfb923c];

export type SelectElement = (element?: { kind: 'player'; id: GameId<'players'> }) => void;

const logged = new Set<string>();

export const Player = ({
  game,
  isViewer,
  player,
  onClick,
  historicalTime,
  originX = 0,
}: {
  game: ServerGame;
  isViewer: boolean;
  player: ServerPlayer;
  onClick: SelectElement;
  historicalTime?: number;
  originX?: number;
}) => {
  const playerCharacter = game.playerDescriptions.get(player.id)?.character;
  if (!playerCharacter) {
    throw new Error(`Player ${player.id} has no character`);
  }
  const character = characters.find((c) => c.name === playerCharacter);

  const locationBuffer = game.world.historicalLocations?.get(player.id);
  const historicalLocation = useHistoricalValue<Location>(
    locationFields,
    historicalTime,
    playerLocation(player),
    locationBuffer,
  );
  if (!character) {
    if (!logged.has(playerCharacter)) {
      logged.add(playerCharacter);
      toast.error(`Unknown character ${playerCharacter}`);
    }
    return null;
  }

  if (!historicalLocation) {
    return null;
  }

  if (ISO_DEBUG) {
    const tileDim = game.worldMap.tileDim;
    const { x: cx, y: cy } = isoWorldToScreenCenter(historicalLocation, tileDim, originX);
    const colorIdx = Math.abs(
      player.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0)
    ) % PLAYER_COLORS.length;
    const color = PLAYER_COLORS[colorIdx];
    return (
      <Graphics
        interactive
        cursor="pointer"
        pointerdown={() => onClick({ kind: 'player', id: player.id })}
        draw={(g) => {
          g.clear();
          g.beginFill(color, 0.9);
          g.drawCircle(cx, cy, tileDim / 3);
          g.endFill();
          if (isViewer) {
            g.lineStyle(2, 0xffffff, 0.8);
            g.drawCircle(cx, cy, tileDim / 3 + 3);
          }
        }}
      />
    );
  }

  const isSpeaking = !![...game.world.conversations.values()].find(
    (c) => c.isTyping?.playerId === player.id,
  );
  const isThinking =
    !isSpeaking &&
    !![...game.world.agents.values()].find(
      (a) => a.playerId === player.id && !!a.inProgressOperation,
    );
  const tileDim = game.worldMap.tileDim;
  const historicalFacing = { dx: historicalLocation.dx, dy: historicalLocation.dy };
  return (
    <>
      <Character
        x={worldToScreenCenter(historicalLocation, tileDim).x}
        y={worldToScreenCenter(historicalLocation, tileDim).y}
        orientation={orientationDegrees(historicalFacing)}
        isMoving={historicalLocation.speed > 0}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        emoji={
          player.activity && player.activity.until > (historicalTime ?? Date.now())
            ? player.activity?.emoji
            : undefined
        }
        isViewer={isViewer}
        textureUrl={character.textureUrl}
        spritesheetData={character.spritesheetData}
        speed={character.speed}
        onClick={() => {
          onClick({ kind: 'player', id: player.id });
        }}
      />
    </>
  );
};
