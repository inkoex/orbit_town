import { Container, Graphics, Text } from '@pixi/react';
import { useCallback, useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { Projection } from '../../rendering/projection/Projection';

// A large floating "live screen" jumbotron standing in the sky behind the
// archipelago. Drawn as a STANDING ISO WALL (the container is sheared by the
// 2:1 iso angle so verticals stay vertical while horizontals follow the
// down-right ground axis) — matching the iso floor. Lives high in the sky; the
// viewport's clampTop headroom lets the camera pan/zoom up to see all of it.
const PANEL_W = 1500;
const PANEL_H = 760;
const ISO_SKEW = Math.atan(0.5); // 2:1 diamond → horizontals tilt at slope 0.5

const TITLE_STYLE = new PIXI.TextStyle({
  fontFamily: 'monospace',
  fontSize: 112,
  fontWeight: '700',
  letterSpacing: 12,
  fill: 0xbff7ff,
  align: 'center',
});
const LIVE_STYLE = new PIXI.TextStyle({
  fontFamily: 'monospace',
  fontSize: 52,
  fontWeight: '700',
  letterSpacing: 7,
  fill: 0xff4d6d,
});

interface Props {
  projection: Projection;
  anchorTile: { x: number; y: number };
}

export function IsoBillboard({ projection, anchorTile }: Props) {
  const base = projection.worldToScreen(anchorTile);
  const ref = useRef<PIXI.Container>(null);
  useEffect(() => {
    ref.current?.skew.set(0, ISO_SKEW);
  }, []);

  // Panel centered on the origin so the iso skew shears it around its own center;
  // the container's screen position becomes the panel center.
  const left = -PANEL_W / 2;
  const top = -PANEL_H / 2;
  const draw = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      g.beginFill(0x070b14, 0.94);
      g.drawRect(left, top, PANEL_W, PANEL_H);
      g.endFill();
      const bands = [0x22d3ee, 0x7c5cff, 0xff4d6d, 0xffa94d];
      bands.forEach((c, i) => {
        g.beginFill(c, 0.09);
        g.drawRect(left + 44, top + 110 + i * 155, PANEL_W - 88, 120);
        g.endFill();
      });
      const frame = (w: number, color: number, a: number) => {
        g.lineStyle(w, color, a);
        g.drawRect(left, top, PANEL_W, PANEL_H);
      };
      frame(20, 0x22d3ee, 0.06);
      frame(11, 0x22d3ee, 0.12);
      frame(4, 0x38e6ff, 1.0);
    },
    [left, top],
  );

  return (
    <Container ref={ref} x={base.x} y={base.y}>
      <Graphics draw={draw} />
      <Text text="● LIVE" x={left + 48} y={top + 42} style={LIVE_STYLE} />
      <Text text="ORBIT STATION" anchor={[0.5, 0.5]} x={0} y={0} style={TITLE_STYLE} />
    </Container>
  );
}
