import { Container, Graphics, Text } from '@pixi/react';
import { useCallback } from 'react';
import * as PIXI from 'pixi.js';
import type { Projection } from '../../rendering/projection/Projection';
import type { Platform, Rect } from '../../../data/isoVerticalSlice';
import { Pulse, TickGraphics } from './AnimatedContainer';
import { flowFractions } from './animation';

interface Props {
  width: number;
  height: number;
  platforms: Platform[];
  bridges: Rect[];
  projection: Projection;
  onpointerup?: (e: any) => void;
  onpointerdown?: (e: any) => void;
}

// "Antigravity Orbit" archipelago: dark slabs floating in space, each with a
// glowing cyan rim. Floor is drawn only for walkable tiles (platforms + bridges)
// so the void between islands stays empty and the starfield shows through. Glow
// lives only on each platform's rim — never on the tile mesh.
const SLAB_FILL = 0x0a0e18;
const GRID_LINE = 0x123042;
const RIM_CYAN = 0x22d3ee;
const RIM_CYAN_HOT = 0x38e6ff;

const LABEL_STYLE = new PIXI.TextStyle({
  fontFamily: 'monospace',
  fontSize: 90,
  fontWeight: '700',
  letterSpacing: 12,
  fill: 0x9fe9f5,
});

export function IsoMap({
  width,
  height,
  platforms,
  bridges,
  projection,
  onpointerup,
  onpointerdown,
}: Props) {
  // Floor: walkable tiles only (platforms + bridges). One invisible bounding-box
  // hit-rect keeps click/drag reliable; void clicks are rejected upstream by
  // isWalkableTile, so covering the void with the hit-rect is harmless.
  const drawFloor = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      const tile = (x: number, y: number) => {
        const top = projection.worldToScreen({ x, y });
        const right = projection.worldToScreen({ x: x + 1, y });
        const bottom = projection.worldToScreen({ x: x + 1, y: y + 1 });
        const left = projection.worldToScreen({ x, y: y + 1 });
        g.beginFill(SLAB_FILL);
        g.lineStyle(1, GRID_LINE, 0.35);
        g.moveTo(top.x, top.y);
        g.lineTo(right.x, right.y);
        g.lineTo(bottom.x, bottom.y);
        g.lineTo(left.x, left.y);
        g.lineTo(top.x, top.y);
        g.endFill();
      };
      for (const r of [...platforms.map((p) => p.rect), ...bridges]) {
        for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) tile(x, y);
      }
      const c = [
        projection.worldToScreen({ x: 0, y: 0 }),
        projection.worldToScreen({ x: width, y: 0 }),
        projection.worldToScreen({ x: width, y: height }),
        projection.worldToScreen({ x: 0, y: height }),
      ];
      const xs = c.map((p) => p.x);
      const ys = c.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      g.beginFill(0x000000, 0.001);
      g.drawRect(minX, minY, Math.max(...xs) - minX, Math.max(...ys) - minY);
      g.endFill();
    },
    [platforms, bridges, width, height, projection],
  );

  // One glowing rim per platform: stacked translucent perimeter strokes fake a
  // bloom (widest+faintest first, crisp line on top) — zero filters/deps.
  const drawRims = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      for (const p of platforms) {
        const r = p.rect;
        const c = [
          projection.worldToScreen({ x: r.x, y: r.y }),
          projection.worldToScreen({ x: r.x + r.w, y: r.y }),
          projection.worldToScreen({ x: r.x + r.w, y: r.y + r.h }),
          projection.worldToScreen({ x: r.x, y: r.y + r.h }),
        ];
        const stroke = (w: number, color: number, alpha: number) => {
          g.lineStyle(w, color, alpha);
          g.moveTo(c[0].x, c[0].y);
          g.lineTo(c[1].x, c[1].y);
          g.lineTo(c[2].x, c[2].y);
          g.lineTo(c[3].x, c[3].y);
          g.lineTo(c[0].x, c[0].y);
        };
        stroke(18, RIM_CYAN, 0.06);
        stroke(12, RIM_CYAN, 0.1);
        stroke(7, RIM_CYAN_HOT, 0.18);
        stroke(3, RIM_CYAN, 1.0);
      }
    },
    [platforms, projection],
  );

  // Glowing pedestals: a couple of cyan pylons per platform. Decorative only
  // (no collision), drawn below the agents so characters pass in front of them.
  const drawProps = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      const pylon = (tx: number, ty: number) => {
        const { x: cx, y: cy } = projection.worldToScreenCenter({ x: tx, y: ty });
        const top = cy - 120;
        g.beginFill(0x22d3ee, 0.16);
        g.drawEllipse(cx, cy, 26, 13);
        g.endFill();
        g.lineStyle(11, 0x22d3ee, 0.1);
        g.moveTo(cx, cy);
        g.lineTo(cx, top);
        g.lineStyle(3, 0x38e6ff, 0.9);
        g.moveTo(cx, cy);
        g.lineTo(cx, top);
        g.lineStyle(0);
        g.beginFill(0xbff7ff, 1);
        g.drawCircle(cx, top, 6);
        g.endFill();
      };
      for (const p of platforms) {
        pylon(p.rect.x + 1, p.rect.y + 1);
        pylon(p.rect.x + p.rect.w - 2, p.rect.y + p.rect.h - 2);
      }
    },
    [platforms, projection],
  );

  // Energy flowing along each bridge: glowing motes drift from one island toward
  // the next along the bridge centerline, so the archipelago reads as connected
  // and powered. Redrawn per frame (a handful of dots) via the shared clock.
  const drawBridgeFlow = useCallback(
    (g: PIXI.Graphics, t: number) => {
      g.clear();
      for (const r of bridges) {
        const horizontal = r.w >= r.h;
        const start = horizontal
          ? { x: r.x, y: r.y + r.h / 2 }
          : { x: r.x + r.w / 2, y: r.y };
        const end = horizontal
          ? { x: r.x + r.w, y: r.y + r.h / 2 }
          : { x: r.x + r.w / 2, y: r.y + r.h };
        // One mote per ~1.4 tiles of span so long and short bridges feel alike.
        const span = horizontal ? r.w : r.h;
        const count = Math.max(2, Math.round(span / 1.4));
        for (const f of flowFractions(t, 2600, count)) {
          const p = projection.worldToScreen({
            x: start.x + (end.x - start.x) * f,
            y: start.y + (end.y - start.y) * f,
          });
          // Fade in and out at the ends so motes don't pop at the platforms.
          const edge = Math.sin(f * Math.PI);
          g.beginFill(RIM_CYAN_HOT, 0.18 * edge);
          g.drawCircle(p.x, p.y, 9);
          g.endFill();
          g.beginFill(0xbff7ff, 0.9 * edge);
          g.drawCircle(p.x, p.y, 3.5);
          g.endFill();
        }
      }
    },
    [bridges, projection],
  );

  // Sparks rising up each pylon beam — the same two pylons per platform that
  // drawProps plants, so particles and pedestal share a column.
  const drawPylonParticles = useCallback(
    (g: PIXI.Graphics, t: number) => {
      g.clear();
      const beam = (tx: number, ty: number, phaseTiles: number) => {
        const { x: cx, y: cy } = projection.worldToScreenCenter({ x: tx, y: ty });
        const top = cy - 120;
        for (const f of flowFractions(t + phaseTiles, 1700, 3)) {
          const py = cy + (top - cy) * f;
          const a = (1 - f) * 0.9; // brightest at the base, fades as it climbs
          g.beginFill(0xbff7ff, a);
          g.drawCircle(cx, py, 3);
          g.endFill();
        }
      };
      for (const p of platforms) {
        beam(p.rect.x + 1, p.rect.y + 1, 0);
        beam(p.rect.x + p.rect.w - 2, p.rect.y + p.rect.h - 2, 850);
      }
    },
    [platforms, projection],
  );

  return (
    <Container>
      <Graphics
        interactive
        draw={drawFloor}
        onpointerup={onpointerup}
        onpointerdown={onpointerdown}
      />
      <TickGraphics render={drawBridgeFlow} />
      {/* Rims and pylons breathe on slightly different periods so the
          archipelago shimmers instead of pulsing in lockstep. */}
      <Pulse periodMs={3400} min={0.55} max={1}>
        <Graphics draw={drawRims} />
      </Pulse>
      <Pulse periodMs={2700} min={0.5} max={1} phase={0.3}>
        <Graphics draw={drawProps} />
      </Pulse>
      <TickGraphics render={drawPylonParticles} />
      {platforms.map((p) => {
        const pos = projection.worldToScreenCenter({
          x: p.rect.x + p.rect.w / 2,
          y: p.rect.y + p.rect.h / 2,
        });
        return (
          <Text key={p.name} text={p.name} anchor={0.5} x={pos.x} y={pos.y} alpha={0.55} style={LABEL_STYLE} />
        );
      })}
    </Container>
  );
}
