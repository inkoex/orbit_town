import * as PIXI from 'pixi.js';
import { useApp } from '@pixi/react';
import { Player, SelectElement } from './Player.tsx';
import { worldToScreen, screenToWorld } from '../utils/coords';
import { useEffect, useRef, useState } from 'react';
import { PixiStaticMap } from './PixiStaticMap.tsx';
import PixiViewport from './PixiViewport.tsx';
import { Viewport } from 'pixi-viewport';
import { Id } from '../../convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { useSendInput } from '../hooks/sendInput.ts';
import { toastOnError } from '../toasts.ts';
import { DebugPath } from './DebugPath.tsx';
import { PositionIndicator } from './PositionIndicator.tsx';
import { SHOW_DEBUG_UI } from './Game.tsx';
import { ServerGame } from '../hooks/serverGame.ts';
import { ISO_DEBUG } from '../config/debug';
import { isoOriginX, isoViewportSize, isoScreenToWorld, isoWorldToScreen } from '../utils/isoCoords';
import { IsoDebugGrid } from './IsoDebugGrid.tsx';

export const PixiGame = (props: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  game: ServerGame;
  historicalTime: number | undefined;
  width: number;
  height: number;
  setSelectedElement: SelectElement;
}) => {
  // PIXI setup.
  const pixiApp = useApp();
  const viewportRef = useRef<Viewport | undefined>();

  const humanTokenIdentifier = useQuery(api.world.userStatus, { worldId: props.worldId }) ?? null;
  const humanPlayerId = [...props.game.world.players.values()].find(
    (p) => p.human === humanTokenIdentifier,
  )?.id;

  const moveTo = useSendInput(props.engineId, 'moveTo');

  const { width, height, tileDim } = props.game.worldMap;
  const originX = ISO_DEBUG ? isoOriginX(height, tileDim) : 0;
  const isoSize = ISO_DEBUG ? isoViewportSize(width, height, tileDim) : null;

  // Interaction for clicking on the world to navigate.
  const dragStart = useRef<{ screenX: number; screenY: number } | null>(null);
  const onMapPointerDown = (e: any) => {
    // https://pixijs.download/dev/docs/PIXI.FederatedPointerEvent.html
    dragStart.current = { screenX: e.screenX, screenY: e.screenY };
  };

  const [lastDestination, setLastDestination] = useState<{
    x: number;
    y: number;
    t: number;
  } | null>(null);
  const onMapPointerUp = async (e: any) => {
    if (dragStart.current) {
      const { screenX, screenY } = dragStart.current;
      dragStart.current = null;
      const [dx, dy] = [screenX - e.screenX, screenY - e.screenY];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        console.log(`Skipping navigation on drag event (${dist}px)`);
        return;
      }
    }
    if (!humanPlayerId) {
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const gameSpacePx = viewport.toWorld(e.screenX, e.screenY);
    const tileDim = props.game.worldMap.tileDim;
    const gameSpaceTiles = ISO_DEBUG
      ? isoScreenToWorld(gameSpacePx, tileDim, originX)
      : screenToWorld(gameSpacePx, tileDim);
    setLastDestination({ t: Date.now(), ...gameSpaceTiles });
    const roundedTiles = {
      x: Math.floor(gameSpaceTiles.x),
      y: Math.floor(gameSpaceTiles.y),
    };
    console.log(`Moving to ${JSON.stringify(roundedTiles)}`);
    await toastOnError(moveTo({ playerId: humanPlayerId, destination: roundedTiles }));
  };
  const players = [...props.game.world.players.values()];

  // Zoom on the user’s avatar when it is created
  useEffect(() => {
    if (!viewportRef.current || humanPlayerId === undefined) return;

    const humanPlayer = props.game.world.players.get(humanPlayerId)!;
    const initScreenPos = ISO_DEBUG
      ? isoWorldToScreen(humanPlayer.position, tileDim, originX)
      : worldToScreen(humanPlayer.position, tileDim);
    viewportRef.current.animate({
      position: new PIXI.Point(initScreenPos.x, initScreenPos.y),
      scale: 1.5,
    });
  }, [humanPlayerId]);

  return (
    <PixiViewport
      app={pixiApp}
      screenWidth={props.width}
      screenHeight={props.height}
      worldWidth={isoSize ? isoSize.width : width * tileDim}
      worldHeight={isoSize ? isoSize.height : height * tileDim}
      viewportRef={viewportRef}
    >
      {ISO_DEBUG ? (
        <IsoDebugGrid
          width={width}
          height={height}
          tileDim={tileDim}
          onpointerup={onMapPointerUp}
          onpointerdown={onMapPointerDown}
        />
      ) : (
        <PixiStaticMap
          map={props.game.worldMap}
          onpointerup={onMapPointerUp}
          onpointerdown={onMapPointerDown}
        />
      )}
      {!ISO_DEBUG && players.map(
        (p) =>
          // Only show the path for the human player in non-debug mode.
          (SHOW_DEBUG_UI || p.id === humanPlayerId) && (
            <DebugPath key={`path-${p.id}`} player={p} tileDim={tileDim} />
          ),
      )}
      {!ISO_DEBUG && lastDestination && <PositionIndicator destination={lastDestination} tileDim={tileDim} />}
      {(ISO_DEBUG
        ? [...players].sort((a, b) => (a.position.x + a.position.y) - (b.position.x + b.position.y))
        : players
      ).map((p) => (
        <Player
          key={`player-${p.id}`}
          game={props.game}
          player={p}
          isViewer={p.id === humanPlayerId}
          onClick={props.setSelectedElement}
          historicalTime={props.historicalTime}
          originX={originX}
        />
      ))}
    </PixiViewport>
  );
};
export default PixiGame;
