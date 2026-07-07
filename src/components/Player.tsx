import { Character } from './Character.tsx';
import { Graphics, useTick } from '@pixi/react';
import { useRef, useState } from 'react';
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
import { ISO_BUBBLE_DEBUG, ISO_DEBUG, ISO_STATE_DEBUG, VIEW_MODE } from '../config/debug';
import { isoWorldToScreenCenter } from '../utils/isoCoords';
import { IsoCharacter } from './isometric/IsoCharacter';
import { deriveActiveState, debugActiveState } from './isometric/activeState';
import { SpeechBubble } from './isometric/SpeechBubble';
import { ConversationBubble } from './isometric/ConversationBubble';
import { debugBubbleText, truncateBubbleText } from './isometric/bubble';
import { pacingPose, StageDirection } from './isometric/acting';
import type { Projection } from '../rendering/projection/Projection';

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
  isoProjection,
  worldId,
  stageDirections,
}: {
  game: ServerGame;
  isViewer: boolean;
  player: ServerPlayer;
  onClick: SelectElement;
  historicalTime?: number;
  originX?: number;
  isoProjection?: Projection;
  // Needed only by the iso speech-bubble query (listMessages).
  worldId?: Id<'worlds'>;
  // 슬라이스 ②a: 이름(소문자) → 무대지시. 있으면 렌더 직전 오버라이드.
  stageDirections?: Map<string, StageDirection>;
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
  // 연기(②a): 훅이라 early return들보다 앞에서 호출 (모든 렌더에서 같은 순서).
  const name = game.playerDescriptions.get(player.id)?.name;
  const direction = name ? stageDirections?.get(name.toLowerCase()) : undefined;
  const actingNow = useActingNow(direction?.kind === 'working');
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

  if (VIEW_MODE === 'iso' && isoProjection) {
    const now = historicalTime ?? Date.now();
    // Active = a real busy signal right now (typing/thinking/moving/activity).
    // ISO_STATE_DEBUG forces a deterministic split so the contrast is visible
    // even when live data happens to be all-idle. Same signals the 2D path uses.
    const activeState = direction
      ? 'active'
      : ISO_STATE_DEBUG
        ? debugActiveState(player.id)
        : deriveActiveState({
            isSpeaking: game.typingPlayerIds.has(player.id),
            isThinking: game.thinkingPlayerIds.has(player.id),
            isMoving: historicalLocation.speed > 0,
            hasLiveActivity: !!player.activity && player.activity.until > now,
          });
    // Bubble priority: debug > typing dots > live conversation message > idle
    // activity. Invited/walkingOver members show nothing (not participating).
    const conversation = game.world.playerConversation(player);
    const participating =
      conversation?.participants.get(player.id)?.status.kind === 'participating';
    let bubble: React.ReactNode = null;
    if (ISO_BUBBLE_DEBUG) {
      bubble = <SpeechBubble headerName={name} text={debugBubbleText(player.id)} />;
    } else if (game.typingPlayerIds.has(player.id)) {
      bubble = <SpeechBubble text="···" />;
    } else if (participating && conversation && worldId) {
      bubble = (
        <ConversationBubble
          worldId={worldId}
          conversationId={conversation.id}
          playerId={player.id}
          name={name}
          now={now}
        />
      );
    } else if (direction) {
      bubble = (
        <SpeechBubble
          text={`${direction.kind === 'working' ? '⚙' : '⏸'} ${truncateBubbleText(direction.summary, 24)}`}
        />
      );
    } else if (!conversation && player.activity && player.activity.until > now) {
      const { emoji, description } = player.activity;
      bubble = <SpeechBubble text={`${emoji ?? ''} ${truncateBubbleText(description, 24)}`} />;
    }
    // 연기 오버라이드: 서버 데이터는 불변, 렌더에 넘기는 값만 바꾼다 (부록 A VisualAgent).
    const pose = direction?.kind === 'working' && name ? pacingPose(name, actingNow) : undefined;
    const renderPosition = pose
      ? { x: historicalLocation.x + pose.offsetX, y: historicalLocation.y }
      : historicalLocation;
    const renderFacing = pose
      ? pose.facing
      : { dx: historicalLocation.dx, dy: historicalLocation.dy };
    const renderSpeed = pose ? pose.speed : direction ? 0 : historicalLocation.speed;
    return (
      <IsoCharacter
        role={isViewer ? 'human' : 'agent'}
        avatarId={playerCharacter}
        name={name}
        position={renderPosition}
        facing={renderFacing}
        speed={renderSpeed}
        simulationTime={direction ? actingNow : (historicalTime ?? Date.now())}
        projection={isoProjection}
        selected={isViewer}
        activeState={activeState}
        onClick={() => onClick({ kind: 'player', id: player.id })}
      >
        {bubble}
      </IsoCharacter>
    );
  }

  // Typing/thinking come from the fresh render snapshot (the checkpoint's
  // conversation/agent state can be up to 30s stale); mergeRenderState falls back
  // to the checkpoint when no current snapshot is available.
  const isSpeaking = game.typingPlayerIds.has(player.id);
  const isThinking = !isSpeaking && game.thinkingPlayerIds.has(player.id);
  const tileDim = game.worldMap.tileDim;
  const { x: centerX, y: centerY } = worldToScreenCenter(historicalLocation, tileDim);
  const historicalFacing = { dx: historicalLocation.dx, dy: historicalLocation.dy };
  return (
    <>
      <Character
        x={centerX}
        y={centerY}
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

// 연기 중일 때만 ~10fps로 리렌더를 유발하는 시계. Frozen 월드에선 서버발
// 리렌더가 없어서, 이 시계가 없으면 서성임이 정지 사진이 된다.
function useActingNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  const last = useRef(0);
  useTick(() => {
    if (!active) return;
    const t = Date.now();
    if (t - last.current > 100) {
      last.current = t;
      setNow(t);
    }
  });
  return now;
}
