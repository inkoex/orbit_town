import { Container, Graphics, Text } from '@pixi/react';
import { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { Projection } from '../../rendering/projection/Projection';
import type { Platform, Rect } from '../../../data/isoVerticalSlice';
import { Pulse, TickGraphics, ZoomFade } from './AnimatedContainer';
import { flowFractions, remapClamped } from './animation';

interface Props {
  width: number;
  height: number;
  platforms: Platform[];
  bridges: Rect[];
  projection: Projection;
  // Camera handle for zoom-reactive fading of the floor labels.
  viewportRef?: MutableRefObject<{ scale: { x: number } } | undefined>;
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

// Slab extrusion: platforms read as thick floating slabs (Antigravity ref),
// not flat outlines. Left face darker than right = fake directional light.
const SLAB_T = 64;
const SLAB_LEFT = 0x060a12;
const SLAB_RIGHT = 0x0a1020;

const LABEL_STYLE = new PIXI.TextStyle({
  fontFamily: 'monospace',
  fontSize: 90,
  fontWeight: '700',
  letterSpacing: 12,
  fill: 0x9fe9f5,
});

const PLATE_STYLE = new PIXI.TextStyle({
  fontFamily: 'monospace',
  fontSize: 36,
  fontWeight: '700',
  letterSpacing: 5,
  fill: 0xbff7ff,
});

// Platform name on a plate riveted to the front-left slab face (the reference's
// "MAKER SPACE" treatment). Same shear trick as IsoBillboard: the c3→c2 edge
// runs down-right at slope 0.5 on screen, so skew(0, atan(0.5)) lays the plate
// flush with that face.
function PlatformEdgePlate({ platform, projection }: { platform: Platform; projection: Projection }) {
  const r = platform.rect;
  const c3 = projection.worldToScreen({ x: r.x, y: r.y + r.h });
  const c2 = projection.worldToScreen({ x: r.x + r.w, y: r.y + r.h });
  const ref = useRef<PIXI.Container>(null);
  useEffect(() => {
    ref.current?.skew.set(0, Math.atan(0.5));
  }, []);
  const plateW = platform.name.length * 30 + 72;
  const plateH = 48;
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.lineStyle(8, RIM_CYAN, 0.1);
      g.drawRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 8);
      g.lineStyle(2.5, RIM_CYAN_HOT, 0.9);
      g.beginFill(0x070b14, 0.92);
      g.drawRoundedRect(-plateW / 2, -plateH / 2, plateW, plateH, 8);
      g.endFill();
    },
    [plateW],
  );
  return (
    <Container ref={ref} x={(c3.x + c2.x) / 2} y={(c3.y + c2.y) / 2 + SLAB_T / 2}>
      <Graphics draw={draw} />
      <Text text={platform.name} anchor={0.5} style={PLATE_STYLE} />
    </Container>
  );
}

export function IsoMap({
  width,
  height,
  platforms,
  bridges,
  projection,
  viewportRef,
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
      // Bounding-box click target. Use an explicit hitArea rather than a drawn
      // near-transparent rect: even at alpha 0.001 the rect's antialiased top
      // edge showed as a faint full-width horizontal seam in the sky. hitArea
      // renders nothing but keeps the whole box clickable (void clicks are
      // rejected upstream by isWalkableTile).
      g.hitArea = new PIXI.Rectangle(minX, minY, Math.max(...xs) - minX, Math.max(...ys) - minY);
    },
    [platforms, bridges, width, height, projection],
  );

  // Side faces: extrude each platform down by SLAB_T. Only the two camera-facing
  // faces exist in a 2:1 iso view (below the c3→c2 and c2→c1 edges).
  const drawSlabSides = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      for (const p of platforms) {
        const r = p.rect;
        const c1 = projection.worldToScreen({ x: r.x + r.w, y: r.y });
        const c2 = projection.worldToScreen({ x: r.x + r.w, y: r.y + r.h });
        const c3 = projection.worldToScreen({ x: r.x, y: r.y + r.h });
        g.beginFill(SLAB_LEFT);
        g.drawPolygon([c3.x, c3.y, c2.x, c2.y, c2.x, c2.y + SLAB_T, c3.x, c3.y + SLAB_T]);
        g.endFill();
        g.beginFill(SLAB_RIGHT);
        g.drawPolygon([c2.x, c2.y, c1.x, c1.y, c1.x, c1.y + SLAB_T, c2.x, c2.y + SLAB_T]);
        g.endFill();
        // Bottom edges get a faint line so the slab reads as a crisp volume.
        g.lineStyle(2, GRID_LINE, 0.4);
        g.moveTo(c3.x, c3.y + SLAB_T);
        g.lineTo(c2.x, c2.y + SLAB_T);
        g.lineTo(c1.x, c1.y + SLAB_T);
        g.lineStyle(0);
      }
    },
    [platforms, projection],
  );

  // Soft cyan pool of light beneath each slab — sells the antigravity hover.
  const drawUnderGlow = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      for (const p of platforms) {
        const r = p.rect;
        const c1 = projection.worldToScreen({ x: r.x + r.w, y: r.y });
        const c2 = projection.worldToScreen({ x: r.x + r.w, y: r.y + r.h });
        const c3 = projection.worldToScreen({ x: r.x, y: r.y + r.h });
        const cx = (c3.x + c1.x) / 2;
        const cy = c2.y + SLAB_T + 26;
        const rx = ((c1.x - c3.x) / 2) * 0.8;
        const layers: [number, number][] = [
          [1, 0.05],
          [0.7, 0.07],
          [0.45, 0.1],
        ];
        for (const [f, a] of layers) {
          g.beginFill(RIM_CYAN, a);
          g.drawEllipse(cx, cy, rx * f, rx * f * 0.22);
          g.endFill();
        }
      }
    },
    [platforms, projection],
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
      {/* Paint order: glow pool → slab sides → floor (keeps the hitArea) → fx. */}
      <Pulse periodMs={5200} min={0.6} max={1}>
        <Graphics draw={drawUnderGlow} />
      </Pulse>
      <Graphics draw={drawSlabSides} />
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
      {platforms.map((p) => (
        <PlatformEdgePlate key={`plate-${p.name}`} platform={p} projection={projection} />
      ))}
      {/* Floor labels are orientation hints for the zoomed-out view; the edge
          plates carry the names up close, so these fade away as you zoom in. */}
      {(() => {
        const labels = platforms.map((p) => {
          const pos = projection.worldToScreenCenter({
            x: p.rect.x + p.rect.w / 2,
            y: p.rect.y + p.rect.h / 2,
          });
          return (
            <Text key={p.name} text={p.name} anchor={0.5} x={pos.x} y={pos.y} style={LABEL_STYLE} />
          );
        });
        return viewportRef ? (
          <ZoomFade
            viewportRef={viewportRef}
            alphaFor={(s) => remapClamped(s, 0.32, 0.9, 0.35, 0.06)}
          >
            {labels}
          </ZoomFade>
        ) : (
          <Container alpha={0.22}>{labels}</Container>
        );
      })()}
    </Container>
  );
}
