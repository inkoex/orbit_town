import { Container, Graphics } from '@pixi/react';
import { useCallback } from 'react';
import * as PIXI from 'pixi.js';
import type { Projection } from '../../rendering/projection/Projection';

interface Props {
  width: number;
  height: number;
  projection: Projection;
  onpointerup?: (e: any) => void;
  onpointerdown?: (e: any) => void;
}

// Floor is drawn in code (the Kenney pack is 3D blocks, not diamond tiles).
// The "Antigravity Orbit" look = a dark floating slab whose neon rim glows, not a
// recolored grid. So it splits into layers: a recessive interior (dark fill +
// faint grid, which also carries the click hit-area) and a separate perimeter
// "rim" that glows. Glow lives ONLY on the rim — putting it on the 100-tile mesh
// would light every interior seam and read as a glowing net, not a slab.
const SLAB_FILL = 0x0a0e18;
const GRID_LINE = 0x123042;
const RIM_CYAN = 0x22d3ee;
const RIM_CYAN_HOT = 0x38e6ff;

export function IsoMap({ width, height, projection, onpointerup, onpointerdown }: Props) {
  const outerCorners = useCallback(
    () => [
      projection.worldToScreen({ x: 0, y: 0 }),
      projection.worldToScreen({ x: width, y: 0 }),
      projection.worldToScreen({ x: width, y: height }),
      projection.worldToScreen({ x: 0, y: height }),
    ],
    [width, height, projection],
  );

  // Interior tiles + invisible hit-area. Recessive on purpose so the rim pops.
  const drawInterior = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
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
        }
      }
      // Invisible hit-area over the floor bounding box so pointerdown/up are
      // captured reliably (per-tile fills can miss a click on a seam).
      const corners = outerCorners();
      const xs = corners.map((p) => p.x);
      const ys = corners.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      g.beginFill(0x000000, 0.001);
      g.drawRect(minX, minY, Math.max(...xs) - minX, Math.max(...ys) - minY);
      g.endFill();
    },
    [width, height, projection, outerCorners],
  );

  // Perimeter rim. Stacked translucent strokes fake a bloom (widest+faintest
  // first, crisp line on top) — a glowing edge with zero filters/dependencies.
  const drawRim = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      const c = outerCorners();
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
    },
    [outerCorners],
  );

  return (
    <Container>
      <Graphics
        interactive
        draw={drawInterior}
        onpointerup={onpointerup}
        onpointerdown={onpointerdown}
      />
      <Graphics draw={drawRim} />
    </Container>
  );
}
