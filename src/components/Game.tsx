import { useRef, useState } from 'react';
import PixiGame from './PixiGame.tsx';

import { useResizeObserver } from '../hooks/useResizeObserver';
import { Stage } from '@pixi/react';
import { ConvexProvider, useConvex, useQuery } from 'convex/react';
import PlayerDetails from './PlayerDetails.tsx';
import { api } from '../../convex/_generated/api';
import { useWorldHeartbeat } from '../hooks/useWorldHeartbeat.ts';
import { useHistoricalTime } from '../hooks/useHistoricalTime.ts';
import { DebugTimeManager } from './DebugTimeManager.tsx';
import { GameId } from '../../convex/aiTown/ids.ts';
import { useServerGame } from '../hooks/serverGame.ts';
import { AgentCreator } from './AgentCreator';

export const SHOW_DEBUG_UI = !!import.meta.env.VITE_SHOW_DEBUG_UI;

export default function Game() {
  const convex = useConvex();
  const [selectedElement, setSelectedElement] = useState<{
    kind: 'player';
    id: GameId<'players'>;
  }>();
  const [gameWrapperRef, { width, height }] = useResizeObserver<HTMLDivElement>();

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const engineId = worldStatus?.engineId;

  const game = useServerGame(worldId);

  // Send a periodic heartbeat to our world to keep it alive.
  useWorldHeartbeat();

  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const { historicalTime, timeManager } = useHistoricalTime(worldState?.engine);

  const scrollViewRef = useRef<HTMLDivElement>(null);

  if (!worldId || !engineId || !game) {
    return null;
  }
  return (
    <>
      {SHOW_DEBUG_UI && <DebugTimeManager timeManager={timeManager} width={200} height={100} />}
      {/* Game area — fills the full viewport (App.tsx gives Game an
          `absolute inset-0` parent). useElementSize on gameWrapperRef now
          measures the whole screen, not a grid column, so the iso map is
          truly full-bleed; the panel below floats on top instead of sharing
          a CSS Grid track with it. */}
      <div
        className="absolute inset-0 overflow-hidden"
        ref={gameWrapperRef}
        style={{
          background:
            'radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent),' +
            'radial-gradient(1.5px 1.5px at 70% 60%, #cfe6ff, transparent),' +
            'radial-gradient(1.5px 1.5px at 45% 80%, #fff, transparent),' +
            'radial-gradient(1.5px 1.5px at 85% 25%, #9bd, transparent),' +
            '#05060f',
        }}
      >
        {/* No extra wrapper here: Tailwind's default `.container` utility
            (unconfigured in tailwind.config.js) caps width at its breakpoint
            max-widths (e.g. 1536px on a 2xl screen) regardless of the
            gameWrapperRef measurement above it — that silently capped the
            canvas on wide monitors once the outer max-w-[1400px] constraint
            was removed for the full-bleed layout. Stage reads width/height
            straight from useElementSize, no intermediate layout box needed. */}
        <Stage width={width} height={height} options={{ backgroundAlpha: 0 }}>
          {/* Re-propagate context because contexts are not shared between renderers.
https://github.com/michalochman/react-pixi-fiber/issues/145#issuecomment-531549215 */}
          <ConvexProvider client={convex}>
            <PixiGame
              game={game}
              worldId={worldId}
              engineId={engineId}
              width={width}
              height={height}
              historicalTime={historicalTime}
              setSelectedElement={setSelectedElement}
            />
          </ConvexProvider>
        </Stage>
      </div>

      {/* Floating sliding panel — translucent glass docked to the right
          edge, overlaying the map instead of sharing space with it. */}
      <div
        className="hud-glass hud-scroll fixed top-4 right-4 bottom-4 z-10 w-80 rounded-lg flex flex-col overflow-y-auto px-4 py-4 text-ink-100"
        ref={scrollViewRef}
      >
        <AgentCreator engineId={engineId} game={game} />
        <PlayerDetails
          worldId={worldId}
          engineId={engineId}
          game={game}
          playerId={selectedElement?.id}
          setSelectedElement={setSelectedElement}
          scrollViewRef={scrollViewRef}
        />
      </div>
    </>
  );
}
