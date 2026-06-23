import { Graphics } from '@pixi/react';
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
// Each tile is the projected quad of its four world corners, so it works for
// any Projection. The filled quads double as the click hit-area for navigation.
export function IsoMap({ width, height, projection, onpointerup, onpointerdown }: Props) {
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const top = projection.worldToScreen({ x, y });
          const right = projection.worldToScreen({ x: x + 1, y });
          const bottom = projection.worldToScreen({ x: x + 1, y: y + 1 });
          const left = projection.worldToScreen({ x, y: y + 1 });
          g.beginFill(0x141a26);
          g.lineStyle(1, 0x2d3748, 0.8);
          g.moveTo(top.x, top.y);
          g.lineTo(right.x, right.y);
          g.lineTo(bottom.x, bottom.y);
          g.lineTo(left.x, left.y);
          g.lineTo(top.x, top.y);
          g.endFill();
        }
      }
    },
    [width, height, projection],
  );

  return (
    <Graphics interactive draw={draw} onpointerup={onpointerup} onpointerdown={onpointerdown} />
  );
}
