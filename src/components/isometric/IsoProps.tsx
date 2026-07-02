import { Container, Graphics, Text } from '@pixi/react';
import { useCallback, useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { Projection } from '../../rendering/projection/Projection';
import { Bob, Pulse, TickGraphics } from './AnimatedContainer';
import { isoDepthKey } from './isoDepth';
import { CUBE_EDGES, projectedCubeVertices } from './holoCube';

// Procedural furniture props (Antigravity-reference pack 3): glowing round
// tables with stools, a CLI console block, and a spinning holographic cube.
// Drawn like the pylons — pure Graphics, no textures — and mounted as siblings
// of the Players inside PixiGame's sortableChildren container, so characters
// occlude them correctly via isoDepthKey. Decorative only: no collision, and
// placements avoid spawns, pylons and the bridge mouths.

const RIM_CYAN = 0x22d3ee;
const RIM_CYAN_HOT = 0x38e6ff;
const GLASS_DARK = 0x0a1220;
const FACE_LEFT = 0x060a12;
const FACE_RIGHT = 0x0a1020;

const CLI_STYLE = new PIXI.TextStyle({
  fontFamily: 'monospace',
  fontSize: 32,
  fontWeight: '700',
  letterSpacing: 3,
  fill: 0x4ade80, // terminal green — deliberate accent against the cyan world
});

interface PropAt {
  tile: { x: number; y: number };
  projection: Projection;
}

// Round glass table on a glowing pedestal, three stools around it.
function IsoTable({ tile, projection }: PropAt) {
  const { x, y } = projection.worldToScreenCenter(tile);

  const drawStools = useCallback((g: PIXI.Graphics) => {
    g.clear();
    for (const [sx, sy] of [
      [-64, 26],
      [64, 26],
      [0, 52],
    ] as const) {
      g.lineStyle(2, RIM_CYAN, 0.35);
      g.moveTo(sx, sy);
      g.lineTo(sx, sy - 8);
      g.lineStyle(1.5, RIM_CYAN, 0.5);
      g.beginFill(GLASS_DARK, 0.9);
      g.drawEllipse(sx, sy - 8, 18, 9);
      g.endFill();
    }
  }, []);

  const drawGlow = useCallback((g: PIXI.Graphics) => {
    g.clear();
    // Floor contact light.
    g.beginFill(RIM_CYAN, 0.14);
    g.drawEllipse(0, -2, 22, 10);
    g.endFill();
    // Pedestal beam.
    g.lineStyle(8, RIM_CYAN, 0.12);
    g.moveTo(0, -4);
    g.lineTo(0, -52);
    g.lineStyle(2.5, RIM_CYAN_HOT, 0.8);
    g.moveTo(0, -4);
    g.lineTo(0, -52);
    // Glass tabletop with a glowing rim.
    g.lineStyle(10, RIM_CYAN, 0.08);
    g.drawEllipse(0, -58, 64, 30);
    g.lineStyle(4, RIM_CYAN_HOT, 0.7);
    g.beginFill(GLASS_DARK, 0.88);
    g.drawEllipse(0, -58, 64, 30);
    g.endFill();
  }, []);

  return (
    <Container x={x} y={y} zIndex={isoDepthKey(tile, 'object', 0)}>
      <Graphics draw={drawStools} />
      <Pulse periodMs={3100} min={0.6} max={1}>
        <Graphics draw={drawGlow} />
      </Pulse>
    </Container>
  );
}

// A squat console block with a "CLI >_" plate — foreshadows the work-layer
// command intake (the reference's MAKER SPACE terminal).
function IsoConsole({ tile, projection }: PropAt) {
  const { x, y } = projection.worldToScreenCenter(tile);
  const plateRef = useRef<PIXI.Container>(null);
  useEffect(() => {
    plateRef.current?.skew.set(0, Math.atan(0.5));
  }, []);

  // Mini iso block in screen space: top diamond (half-w 75, half-h 37.5)
  // centered at y=-48, side faces extruded down 26px.
  const drawBlock = useCallback((g: PIXI.Graphics) => {
    g.clear();
    const cx = 0;
    const cy = -48;
    const hw = 75;
    const hh = 37.5;
    const T = 26;
    const top = { x: cx, y: cy - hh };
    const right = { x: cx + hw, y: cy };
    const bottom = { x: cx, y: cy + hh };
    const left = { x: cx - hw, y: cy };
    g.beginFill(FACE_LEFT);
    g.drawPolygon([left.x, left.y, bottom.x, bottom.y, bottom.x, bottom.y + T, left.x, left.y + T]);
    g.endFill();
    g.beginFill(FACE_RIGHT);
    g.drawPolygon([
      bottom.x,
      bottom.y,
      right.x,
      right.y,
      right.x,
      right.y + T,
      bottom.x,
      bottom.y + T,
    ]);
    g.endFill();
    g.lineStyle(8, RIM_CYAN, 0.1);
    g.drawPolygon([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y]);
    g.lineStyle(2.5, RIM_CYAN_HOT, 0.9);
    g.beginFill(GLASS_DARK, 0.95);
    g.drawPolygon([top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y]);
    g.endFill();
  }, []);

  return (
    <Container x={x} y={y} zIndex={isoDepthKey(tile, 'object', 0)}>
      <Graphics draw={drawBlock} />
      {/* Plate sheared onto the front-left face. */}
      <Container ref={plateRef} x={-37.5} y={-16}>
        <Pulse periodMs={2100} min={0.7} max={1}>
          <Text text="CLI >_" anchor={0.5} style={CLI_STYLE} />
        </Pulse>
      </Container>
    </Container>
  );
}

// Spinning holographic wireframe cube floating above its tile.
function HoloCube({ tile, projection }: PropAt) {
  const { x, y } = projection.worldToScreenCenter(tile);

  const drawCube = useCallback((g: PIXI.Graphics, t: number) => {
    g.clear();
    const v = projectedCubeVertices(t, 46);
    g.lineStyle(3, RIM_CYAN_HOT, 0.5);
    for (const [a, b] of CUBE_EDGES) {
      g.moveTo(v[a].x, v[a].y);
      g.lineTo(v[b].x, v[b].y);
    }
    g.lineStyle(0);
    g.beginFill(0xbff7ff, 0.9);
    for (const p of v) {
      g.drawCircle(p.x, p.y, 3);
    }
    g.endFill();
  }, []);

  return (
    <Container x={x} y={y} zIndex={isoDepthKey(tile, 'object', 60)}>
      <Bob periodMs={4200} amplitudePx={10} y={-190}>
        <TickGraphics render={drawCube} />
      </Bob>
    </Container>
  );
}

// Fixed placements. Avoids: spawns human (4,4) / agent (15,4); pylons CAFE
// (2,2)/(6,6), LIBRARY (13,2)/(17,6), EVENT (7,11)/(12,14); bridge mouths x 8-9.
export function IsoPropsLayer({ projection }: { projection: Projection }) {
  return (
    <>
      <IsoTable tile={{ x: 3, y: 5 }} projection={projection} />
      <IsoTable tile={{ x: 5, y: 2 }} projection={projection} />
      <IsoTable tile={{ x: 14, y: 6 }} projection={projection} />
      <IsoTable tile={{ x: 11, y: 13 }} projection={projection} />
      <IsoConsole tile={{ x: 13, y: 11 }} projection={projection} />
      <HoloCube tile={{ x: 13, y: 11 }} projection={projection} />
    </>
  );
}
