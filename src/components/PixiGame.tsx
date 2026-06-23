import * as PIXI from 'pixi.js';
import { useApp } from '@pixi/react';
import { Player, SelectElement } from './Player.tsx';
import { worldToScreen, screenToWorld } from '../utils/coords';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ISO_DEBUG, VIEW_MODE } from '../config/debug';
import { isoOriginX, isoViewportSize, isoScreenToWorld, isoWorldToScreen } from '../utils/isoCoords';
import { IsoDebugGrid } from './IsoDebugGrid.tsx';
import { Container } from '@pixi/react';
import { createIsoProjection } from '../rendering/projection/isoProjection';
import { IsoMap } from './isometric/IsoMap.tsx';
import { IsoMapObject } from './isometric/IsoMapObject.tsx';
import { isWalkableTile } from '../rendering/isWalkableTile';
import { isoObjects } from '../../data/isoVerticalSlice';
import { ISO_OBJECTS } from '../../data/assets/isoSliceManifest';

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
  const isoMode = VIEW_MODE === 'iso';
  // iso projection for the live game: floor is drawn in code, characters and
  // objects are textured. Metrics are provisional and tuned visually in Task 8.
  const ISO_TILE_W = 64;
  const ISO_TILE_H = 32;
  const isoProjection = useMemo(
    () =>
      isoMode
        ? createIsoProjection({
            tileWidth: ISO_TILE_W,
            tileHeight: ISO_TILE_H,
            originX: height * (ISO_TILE_W / 2) + ISO_TILE_W / 2,
            originY: ISO_TILE_H / 2,
          })
        : null,
    [isoMode, height],
  );
  const originX = ISO_DEBUG ? isoOriginX(height, tileDim) : 0;
  const isoSize = ISO_DEBUG
    ? isoViewportSize(width, height, tileDim)
    : isoMode && isoProjection
      ? isoProjection.viewportSize(width, height)
      : null;

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
      : isoMode && isoProjection
        ? isoProjection.screenToWorld(gameSpacePx)
        : screenToWorld(gameSpacePx, tileDim);
    // In iso mode, ignore clicks on non-walkable tiles (walls/furniture/edges).
    if (isoMode && !isWalkableTile(props.game.worldMap, gameSpaceTiles)) {
      return;
    }
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
      : isoMode && isoProjection
        ? isoProjection.worldToScreen(humanPlayer.position)
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
        <>
          <IsoDebugGrid
            width={width}
            height={height}
            tileDim={tileDim}
            onpointerup={onMapPointerUp}
            onpointerdown={onMapPointerDown}
          />
          {[...players]
            .sort((a, b) => a.position.x + a.position.y - (b.position.x + b.position.y))
            .map((p) => (
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
        </>
      ) : isoMode && isoProjection ? (
        <>
          <IsoMap
            width={width}
            height={height}
            projection={isoProjection}
            onpointerup={onMapPointerUp}
            onpointerdown={onMapPointerDown}
          />
          {/* Walls, furniture and characters share one sortable container so
              they occlude each other by isoDepthKey (e.g. behind the desk). */}
          <Container sortableChildren>
            {isoObjects.map((o, i) => (
              <IsoMapObject
                key={`obj-${i}`}
                tile={o.tile}
                asset={ISO_OBJECTS[o.asset]}
                layer={o.layer}
                projection={isoProjection}
              />
            ))}
            {players.map((p) => (
              <Player
                key={`player-${p.id}`}
                game={props.game}
                player={p}
                isViewer={p.id === humanPlayerId}
                onClick={props.setSelectedElement}
                historicalTime={props.historicalTime}
                isoProjection={isoProjection}
              />
            ))}
          </Container>
        </>
      ) : (
        <>
          <PixiStaticMap
            map={props.game.worldMap}
            onpointerup={onMapPointerUp}
            onpointerdown={onMapPointerDown}
          />
          {players.map(
            (p) =>
              (SHOW_DEBUG_UI || p.id === humanPlayerId) && (
                <DebugPath key={`path-${p.id}`} player={p} tileDim={tileDim} />
              ),
          )}
          {lastDestination && (
            <PositionIndicator destination={lastDestination} tileDim={tileDim} />
          )}
          {players.map((p) => (
            <Player
              key={`player-${p.id}`}
              game={props.game}
              player={p}
              isViewer={p.id === humanPlayerId}
              onClick={props.setSelectedElement}
              historicalTime={props.historicalTime}
            />
          ))}
        </>
      )}
    </PixiViewport>
  );
};
export default PixiGame;
