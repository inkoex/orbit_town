import { Container, Sprite, Graphics } from '@pixi/react';
import { useCallback } from 'react';
import * as PIXI from 'pixi.js';
import type { Projection } from '../../rendering/projection/Projection';
import { ISO_CHARACTER_FRAMES, CHARACTER_FOOT_ANCHOR } from '../../../data/assets/isoSliceManifest';
import { facingToIsoDirection, walkFrameAt } from './orientation';
import { isoDepthKey } from './isoDepth';

interface Props {
  role: 'human' | 'agent';
  position: { x: number; y: number };
  facing: { dx: number; dy: number };
  speed: number;
  simulationTime: number;
  projection: Projection;
  selected?: boolean;
  onClick?: () => void;
}

const SPRITE_W = 256;
const SPRITE_H = 512;

// A character anchored at its foot contact. The whole thing sits in one
// Container whose zIndex (isoDepthKey) is sorted against walls/furniture in the
// parent sortableChildren container, so a character walking behind the desk is
// occluded. role is shown via tint (Kenney ships one Human model).
export function IsoCharacter({
  role,
  position,
  facing,
  speed,
  simulationTime,
  projection,
  selected,
  onClick,
}: Props) {
  const dir = facingToIsoDirection(facing);
  const frame = walkFrameAt(simulationTime, speed);
  const frames = ISO_CHARACTER_FRAMES[dir];
  const src = frame === 'idle' ? frames.idle : frames.walk[Number(frame.slice(-1))];
  const { x, y } = projection.worldToScreenCenter(position);
  const tint = role === 'agent' ? 0x9fd8ff : 0xffffff;

  const drawRing = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      if (!selected) return;
      g.lineStyle(2, 0x22d3ee, 0.9);
      g.drawEllipse(0, 0, 22, 11);
    },
    [selected],
  );

  return (
    <Container x={x} y={y} zIndex={isoDepthKey(position, 'object', 50)} sortableChildren>
      <Graphics draw={drawRing} zIndex={0} />
      <Sprite
        image={src}
        anchor={[CHARACTER_FOOT_ANCHOR.x, CHARACTER_FOOT_ANCHOR.y]}
        width={SPRITE_W}
        height={SPRITE_H}
        tint={tint}
        zIndex={1}
        interactive
        cursor="pointer"
        pointerdown={onClick}
      />
    </Container>
  );
}
