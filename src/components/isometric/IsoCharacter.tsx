import { Container, Sprite, Graphics } from '@pixi/react';
import { useCallback, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { Projection } from '../../rendering/projection/Projection';
import { resolveAvatarFrames, CHARACTER_FOOT_ANCHOR } from '../../../data/assets/isoSliceManifest';
import { facingToIsoDirection, walkFrameAt, type IsoDirection } from './orientation';
import { isoDepthKey } from './isoDepth';
import type { ActiveState } from './activeState';
import { Pulse } from './AnimatedContainer';

interface Props {
  role: 'human' | 'agent';
  // Which avatar frame set to render; falls back to the default model.
  avatarId?: string;
  position: { x: number; y: number };
  facing: { dx: number; dy: number };
  speed: number;
  simulationTime: number;
  projection: Projection;
  selected?: boolean;
  // The legibility payload: 'active' agents read as lit/full, 'idle' as dimmed.
  activeState?: ActiveState;
  onClick?: () => void;
}

// On-screen display size (world units). Tile is 256 wide, so 128 = half a tile.
// This is the size knob — smaller/larger is instant and fully reversible; the
// source PNGs stay full-res (256x512) so scaling back up stays crisp.
const SPRITE_W = 128;
const SPRITE_H = 256;

// A character anchored at its foot contact. The whole thing sits in one
// Container whose zIndex (isoDepthKey) is sorted against walls/furniture in the
// parent sortableChildren container, so a character walking behind the desk is
// occluded. role is shown via tint (Kenney ships one Human model).
export function IsoCharacter({
  role,
  avatarId,
  position,
  facing,
  speed,
  simulationTime,
  projection,
  selected,
  activeState = 'active',
  onClick,
}: Props) {
  // Keep the previous direction as hysteresis so a jittering facing vector
  // doesn't flip the sprite every frame near a diagonal boundary.
  const prevDir = useRef<IsoDirection>('se');
  // Avatar frames are rendered facing each travel direction directly (the render
  // pipeline orients them correctly), so the iso direction maps straight to the
  // frame set — no sprite rotation compensation needed.
  const dir = facingToIsoDirection(facing, prevDir.current);
  prevDir.current = dir;
  const frame = walkFrameAt(simulationTime, speed);
  const frames = resolveAvatarFrames(avatarId)[dir];
  const src = frame === 'idle' ? frames.idle : frames.walk[Number(frame.slice(-1))];
  const { x, y } = projection.worldToScreenCenter(position);
  // Tint stays role-based (agent cyan / human white). idle is conveyed by alpha,
  // NOT by overwriting the tint, so the role distinction survives.
  const tint = role === 'agent' ? 0x9fd8ff : 0xffffff;
  const isActive = activeState !== 'idle';
  const spriteAlpha = isActive ? 1 : 0.5;

  const drawRing = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      if (!selected) return;
      g.lineStyle(2, 0x22d3ee, 0.9);
      g.drawEllipse(0, 0, 22, 11);
    },
    [selected],
  );

  // Active halo: a soft FILLED glow under the feet — deliberately distinct from
  // the stroked selection ring so the two meanings never collide.
  const drawActiveGlow = useCallback(
    (g: PIXI.Graphics) => {
      g.clear();
      if (!isActive) return;
      g.beginFill(0x22d3ee, 0.22);
      g.drawEllipse(0, 0, 30, 15);
      g.endFill();
      g.beginFill(0x38e6ff, 0.16);
      g.drawEllipse(0, 0, 18, 9);
      g.endFill();
    },
    [isActive],
  );

  return (
    <Container x={x} y={y} zIndex={isoDepthKey(position, 'object', 50)} sortableChildren>
      {/* Active agents pulse their underfoot halo — a soft "working" heartbeat. */}
      <Pulse periodMs={1900} min={0.45} max={1} zIndex={-1}>
        <Graphics draw={drawActiveGlow} />
      </Pulse>
      <Graphics draw={drawRing} zIndex={0} />
      <Sprite
        image={src}
        anchor={[CHARACTER_FOOT_ANCHOR.x, CHARACTER_FOOT_ANCHOR.y]}
        width={SPRITE_W}
        height={SPRITE_H}
        tint={tint}
        alpha={spriteAlpha}
        zIndex={1}
        interactive
        cursor="pointer"
        pointerdown={onClick}
      />
    </Container>
  );
}
