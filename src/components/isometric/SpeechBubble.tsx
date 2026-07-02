import { Container, Graphics, Text, useTick } from '@pixi/react';
import { useCallback, useMemo, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { bubbleAlpha } from './bubble';

// Antigravity-style chat bubble above an agent's head: dark rounded panel with
// a cyan name header, glowing border and a small tail pointing at the speaker.
// Purely presentational — message selection/fade math lives in bubble.ts.
//
// Coordinates are in the IsoCharacter container space (0,0 = foot contact).
// Sprite is 256 tall with foot anchor 0.88, so the head top sits at ≈ -225;
// the tail tip floats just above it.
const TAIL_TIP_Y = -238;
const PANEL_BOTTOM_Y = -252;
const PAD = 18;
const MAX_TEXT_W = 420;

const HEADER_STYLE = new PIXI.TextStyle({
  fontFamily: 'monospace',
  fontSize: 30,
  fontWeight: '700',
  letterSpacing: 3,
  fill: 0x38e6ff,
});
// Chat text may be Korean — Noto Sans KR is loaded by the page CSS.
const BODY_STYLE = new PIXI.TextStyle({
  fontFamily: ['Noto Sans KR', 'monospace'],
  fontSize: 34,
  fill: 0xeafdff,
  wordWrap: true,
  wordWrapWidth: MAX_TEXT_W,
});

interface Props {
  headerName?: string;
  text: string;
  // Message age when this bubble mounted; the internal ticker continues from
  // here. Keyed remounts (per messageUuid) reset the clock.
  ageAtMountMs?: number;
  // false = persistent bubble (typing dots / activity / debug) — no fade-out.
  fade?: boolean;
}

export function SpeechBubble({ headerName, text, ageAtMountMs = 0, fade = false }: Props) {
  // Capture the mount-time age once; re-renders with a drifting `now` prop must
  // not re-anchor the fade clock (only a key change should).
  const age0 = useRef(ageAtMountMs).current;
  const clock = useRef(0);
  const ref = useRef<PIXI.Container>(null);

  // Fade must be ticker-driven: with the world Frozen the React render pump
  // stops, but the PIXI ticker keeps running — same idiom as Bob/Pulse.
  useTick((delta) => {
    if (!fade || !ref.current) return;
    clock.current += delta * (1000 / 60);
    const a = bubbleAlpha(age0 + clock.current);
    ref.current.alpha = a;
    ref.current.visible = a > 0;
  });

  const layout = useMemo(() => {
    const body = PIXI.TextMetrics.measureText(text, BODY_STYLE);
    const header = headerName
      ? PIXI.TextMetrics.measureText(headerName, HEADER_STYLE)
      : undefined;
    const innerW = Math.max(60, body.width, header?.width ?? 0);
    const headerH = header ? header.height + 6 : 0;
    const panelW = innerW + PAD * 2;
    const panelH = headerH + body.height + PAD * 2;
    return { panelW, panelH, headerH, left: -panelW / 2, top: PANEL_BOTTOM_Y - panelH };
  }, [text, headerName]);

  const drawPanel = useCallback(
    (g: PIXI.Graphics) => {
      const { panelW, panelH, left, top } = layout;
      g.clear();
      // Stacked-stroke glow (same idiom as the platform rims), crisp line last.
      g.lineStyle(10, 0x22d3ee, 0.08);
      g.drawRoundedRect(left, top, panelW, panelH, 16);
      g.lineStyle(5, 0x22d3ee, 0.16);
      g.drawRoundedRect(left, top, panelW, panelH, 16);
      g.lineStyle(2, 0x38e6ff, 0.9);
      g.beginFill(0x0a1220, 0.92);
      g.drawRoundedRect(left, top, panelW, panelH, 16);
      g.endFill();
      // Tail — drawn after the panel so it covers the bottom border where they meet.
      g.lineStyle(0);
      g.beginFill(0x0a1220, 0.92);
      g.moveTo(-11, PANEL_BOTTOM_Y + 1);
      g.lineTo(11, PANEL_BOTTOM_Y + 1);
      g.lineTo(0, TAIL_TIP_Y);
      g.closePath();
      g.endFill();
    },
    [layout],
  );

  return (
    <Container ref={ref} zIndex={3}>
      <Graphics draw={drawPanel} />
      {headerName && (
        <Text
          text={headerName}
          style={HEADER_STYLE}
          x={layout.left + PAD}
          y={layout.top + PAD}
        />
      )}
      <Text
        text={text}
        style={BODY_STYLE}
        x={layout.left + PAD}
        y={layout.top + PAD + layout.headerH}
      />
    </Container>
  );
}
