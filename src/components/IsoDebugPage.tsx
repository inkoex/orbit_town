import { Stage, Container } from '@pixi/react';
import { IsoDebugGrid } from './IsoDebugGrid';
import { isoViewportSize, isoOriginX, isoScreenToWorld } from '../utils/isoCoords';

const MOCK_W = 20;
const MOCK_H = 20;
const TILE_DIM = 32;

export function IsoDebugPage() {
  const { width, height } = isoViewportSize(MOCK_W, MOCK_H, TILE_DIM);
  const MARGIN = 20;

  return (
    <div style={{ background: '#0a0d14', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24 }}>
      <h1 style={{ color: '#22d3ee', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 16 }}>
        ISO DEBUG PREVIEW — {MOCK_W}×{MOCK_H} mock map
      </h1>
      <Stage width={width + MARGIN * 2} height={height + MARGIN * 2} options={{ background: 0x0a0d14 }}>
        <Container x={MARGIN} y={MARGIN}>
          <IsoDebugGrid
            width={MOCK_W}
            height={MOCK_H}
            tileDim={TILE_DIM}
            onpointerdown={(e: any) => {
              const local = e.data?.getLocalPosition(e.currentTarget);
              if (!local) return;
              const originX = isoOriginX(MOCK_H, TILE_DIM);
              const tile = isoScreenToWorld(local, TILE_DIM, originX);
              const tx = Math.floor(tile.x);
              const ty = Math.floor(tile.y);
              if (tx < 0 || ty < 0 || tx >= MOCK_W || ty >= MOCK_H) return;
              console.log(`[iso-debug] tile=(${tx},${ty}) raw=(${tile.x.toFixed(2)},${tile.y.toFixed(2)})`);
            }}
          />
        </Container>
      </Stage>
      <p style={{ color: '#64748b', fontFamily: 'monospace', marginTop: 12 }}>
        <a href="/" style={{ color: '#22d3ee' }}>← back</a>
        &nbsp;·&nbsp; open DevTools to verify click coords
      </p>
    </div>
  );
}
