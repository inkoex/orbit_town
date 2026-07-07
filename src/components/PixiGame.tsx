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
import { IsoBillboard } from './isometric/IsoBillboard.tsx';
import { IsoLogo } from './isometric/IsoLogo.tsx';
import { IsoPropsLayer } from './isometric/IsoProps.tsx';
import { Bob } from './isometric/AnimatedContainer.tsx';
import { IsoMapObject } from './isometric/IsoMapObject.tsx';
import { isWalkableTile } from '../rendering/isWalkableTile';
import { isoObjects, PLATFORMS, BRIDGES } from '../../data/isoVerticalSlice';
import { ISO_OBJECTS } from '../../data/assets/isoSliceManifest';
import { deriveStageDirections } from './isometric/acting';

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
  // Match the Kenney sprite footprint (256x512) so floor tiles and objects/
  // characters share one scale. 2:1 diamond → height = width / 2.
  const ISO_TILE_W = 256;
  const ISO_TILE_H = 128;
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

  // The neutral work-event feed (workEventsContract.ts): the presentation's
  // only window into the work layer. Rendered as billboard ticker lines —
  // the first place a REAL agent event becomes visible on the map.
  // count 20: 티커(최신 4)와 아바타 연기(에이전트별 최신 이벤트 탐색)가 공유.
  const workEvents = useQuery(api.workEvents.list, isoMode ? { count: 20 } : 'skip');
  const workTicker = useMemo(
    () =>
      (workEvents ?? [])
        .slice(0, 4)
        .map((e) => `◢ ${(e.agentName ?? 'SYS').toUpperCase()} · ${e.summary}`),
    [workEvents],
  );
  // 무대지시는 이벤트 변화(reactive) + 10초 조각시계(TTL/run_finished 만료용)로 재계산.
  const [actingEpoch, setActingEpoch] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActingEpoch((e) => e + 1), 10_000);
    return () => clearInterval(id);
  }, []);
  const stageDirections = useMemo(
    () => deriveStageDirections(workEvents ?? [], Date.now()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actingEpoch = 시간 경과 트리거
    [workEvents, actingEpoch],
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
        console.log(
          `[iso] drag skip ${dist.toFixed(0)}px — down`,
          Math.round(screenX),
          Math.round(screenY),
          'up',
          Math.round(e.screenX),
          Math.round(e.screenY),
        );
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
      console.log(
        '[iso] REJECTED not-walkable — px',
        Math.round(gameSpacePx.x),
        Math.round(gameSpacePx.y),
        '→ tiles',
        gameSpaceTiles.x.toFixed(2),
        gameSpaceTiles.y.toFixed(2),
      );
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

  // Frame the scene once. iso → fit the whole archipelago centered on the map,
  // independent of any human player (the world may be agents-only). top-down →
  // zoom onto the user's avatar once it is created.
  const didInitCamera = useRef(false);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || didInitCamera.current) return;
    if (isoMode && isoProjection) {
      // Wait for a real viewport size. On first mount (before ResizeObserver
      // measures) props.width/height can be 0 — computing a fit scale from that
      // yields 0 or a NEGATIVE scale, which makes pixi build a NaN transform and
      // crashes the whole Stage. The effect re-runs (props.width/height are in
      // the deps) once the real size arrives.
      if (props.width < 100 || props.height < 100) return;
      // Frame the ACTUAL drawn content (platforms + bridges), not the full grid
      // box. The grid is 20x16 but the islands sit off-center within it, so
      // fitting/centering on the grid left a big empty margin on the bottom-left
      // and undersized the map. Compute the content's screen bounding box, fit
      // it into the *visible* area (minus the floating HUD panel/header/footer),
      // and center it there.
      const PANEL_W = 340; // right agent panel (w-80 + right-4)
      const RESERVE_TOP = 140; // header + billboard headroom
      const RESERVE_BOTTOM = 80; // bottom toolbar
      const FILL = 0.95; // how tightly to fill the visible area
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const r of [...PLATFORMS.map((p) => p.rect), ...BRIDGES]) {
        for (const corner of [
          { x: r.x, y: r.y },
          { x: r.x + r.w, y: r.y },
          { x: r.x, y: r.y + r.h },
          { x: r.x + r.w, y: r.y + r.h },
        ]) {
          const s = isoProjection.worldToScreen(corner);
          minX = Math.min(minX, s.x);
          maxX = Math.max(maxX, s.x);
          minY = Math.min(minY, s.y);
          maxY = Math.max(maxY, s.y);
        }
      }
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const visibleW = Math.max(props.width - PANEL_W, 200);
      const visibleH = Math.max(props.height - RESERVE_TOP - RESERVE_BOTTOM, 200);
      const scale = Math.max(Math.min(visibleW / contentW, visibleH / contentH) * FILL, 0.05);
      // Offset the camera target so the content centers in the visible area
      // (left of the panel, below the header) rather than the full window.
      const px = cx + PANEL_W / 2 / scale;
      const py = cy - (RESERVE_TOP - RESERVE_BOTTOM) / 2 / scale;
      viewport.animate({ position: new PIXI.Point(px, py), scale });
      didInitCamera.current = true;
      return;
    }
    if (humanPlayerId === undefined) return;
    const humanPlayer = props.game.world.players.get(humanPlayerId)!;
    const initScreenPos = ISO_DEBUG
      ? isoWorldToScreen(humanPlayer.position, tileDim, originX)
      : worldToScreen(humanPlayer.position, tileDim);
    viewport.animate({
      position: new PIXI.Point(initScreenPos.x, initScreenPos.y),
      scale: 1.5,
    });
    didInitCamera.current = true;
  }, [humanPlayerId, isoMode, isoProjection, width, height, props.width, props.height]);

  return (
    <PixiViewport
      app={pixiApp}
      screenWidth={props.width}
      screenHeight={props.height}
      worldWidth={isoSize ? isoSize.width : width * tileDim}
      worldHeight={isoSize ? isoSize.height : height * tileDim}
      clampTop={isoSize ? 890 : 0}
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
          {/* The jumbotron drifts slowly in the sky — sells the antigravity float. */}
          <Bob periodMs={6500} amplitudePx={16}>
            <IsoBillboard
              projection={isoProjection}
              anchorTile={{ x: 2, y: -3.5 }}
              agentsOnline={props.game.world.agents.size}
              workTicker={workTicker}
            />
          </Bob>
          {/* InKoEx brand mark in the top-left sky, mirroring the jumbotron. */}
          <Bob periodMs={7200} amplitudePx={14}>
            <IsoLogo projection={isoProjection} anchorTile={{ x: -3, y: 2 }} width={720} />
          </Bob>
          <IsoMap
            width={width}
            height={height}
            platforms={PLATFORMS}
            bridges={BRIDGES}
            projection={isoProjection}
            viewportRef={viewportRef}
            onpointerup={onMapPointerUp}
            onpointerdown={onMapPointerDown}
          />
          {/* Walls, furniture and characters share one sortable container so
              they occlude each other by isoDepthKey (e.g. behind the desk). */}
          <Container sortableChildren>
            <IsoPropsLayer projection={isoProjection} />
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
                worldId={props.worldId}
                stageDirections={stageDirections}
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
