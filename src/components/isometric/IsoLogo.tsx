import { Container, Sprite } from '@pixi/react';
import { useEffect, useMemo, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { Projection } from '../../rendering/projection/Projection';

// The InKoEx brand mark floating in the top-left sky, mirroring the jumbotron
// (IsoBillboard) in the top-right. Skewed by the 2:1 iso angle so it reads as a
// sign standing in the world, with a soft cyan glow halo (a blurred, additively
// blended, cyan-tinted copy behind the crisp white mark).
const ISO_SKEW = Math.atan(0.5);
const LOGO_URL = '/assets/inkoex-logo-white.svg';
const LOGO_ASPECT = 266 / 669; // native SVG proportions
const GLOW_CYAN = 0x38e6ff;

interface Props {
  projection: Projection;
  anchorTile: { x: number; y: number };
  // Displayed width of the mark in screen px (height follows the aspect).
  width?: number;
}

export function IsoLogo({ projection, anchorTile, width = 600 }: Props) {
  const base = projection.worldToScreen(anchorTile);
  const ref = useRef<PIXI.Container>(null);
  // Shear the whole sign to the iso ground angle. NEGATIVE skew (mirror of the
  // right-side billboard) so it runs parallel to the top-LEFT platform edge:
  // left drops, right rises.
  useEffect(() => {
    ref.current?.skew.set(0, -ISO_SKEW);
  }, []);

  const h = width * LOGO_ASPECT;
  // Two blur passes stacked → a wide, soft halo around the mark.
  const glowSoft = useMemo(() => new PIXI.BlurFilter(22), []);
  const glowTight = useMemo(() => new PIXI.BlurFilter(9), []);

  return (
    <Container ref={ref} x={base.x} y={base.y}>
      <Sprite
        image={LOGO_URL}
        anchor={0.5}
        width={width * 1.06}
        height={h * 1.06}
        tint={GLOW_CYAN}
        alpha={0.5}
        blendMode={PIXI.BLEND_MODES.ADD}
        filters={[glowSoft]}
      />
      <Sprite
        image={LOGO_URL}
        anchor={0.5}
        width={width * 1.02}
        height={h * 1.02}
        tint={GLOW_CYAN}
        alpha={0.7}
        blendMode={PIXI.BLEND_MODES.ADD}
        filters={[glowTight]}
      />
      <Sprite image={LOGO_URL} anchor={0.5} width={width} height={h} />
    </Container>
  );
}
