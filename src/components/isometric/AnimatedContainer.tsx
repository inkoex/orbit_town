import { Container, Graphics, Text, useTick } from '@pixi/react';
import { useRef } from 'react';
import * as PIXI from 'pixi.js';
import { bobOffset, cycleIndex, pulseValue } from './animation';

// One PIXI tick = 1 at 60fps; convert the frame delta into elapsed milliseconds
// so the oscillation math runs in real time regardless of frame rate.
const MS_PER_FRAME = 1000 / 60;

interface BobProps {
  periodMs: number;
  amplitudePx: number;
  phase?: number;
  x?: number;
  y?: number;
  children?: React.ReactNode;
}

// Floats its children up and down forever. Animates the container's y directly
// in the ticker — no React re-render, no redraw. The base y is added on top of
// the bob offset so callers can still position the container.
export function Bob({ periodMs, amplitudePx, phase = 0, x = 0, y = 0, children }: BobProps) {
  const ref = useRef<PIXI.Container>(null);
  const clock = useRef(0);
  useTick((delta) => {
    clock.current += delta * MS_PER_FRAME;
    if (ref.current) ref.current.y = y + bobOffset(clock.current, periodMs, amplitudePx, phase);
  });
  return (
    <Container ref={ref} x={x} y={y}>
      {children}
    </Container>
  );
}

interface PulseProps {
  periodMs: number;
  min: number;
  max: number;
  phase?: number;
  zIndex?: number;
  children?: React.ReactNode;
}

// Breathes its children's opacity between min and max. Same ticker-driven,
// redraw-free approach as Bob — only the container alpha changes.
export function Pulse({ periodMs, min, max, phase = 0, zIndex, children }: PulseProps) {
  const ref = useRef<PIXI.Container>(null);
  const clock = useRef(0);
  useTick((delta) => {
    clock.current += delta * MS_PER_FRAME;
    if (ref.current) ref.current.alpha = pulseValue(clock.current, periodMs, min, max, phase);
  });
  return (
    <Container ref={ref} zIndex={zIndex}>
      {children}
    </Container>
  );
}

interface TickGraphicsProps {
  // Called every frame with the graphics handle and the elapsed clock (ms).
  // Implementations should g.clear() then redraw — used for flowing/looping
  // effects that genuinely need a per-frame redraw (a few strokes, cheap).
  render: (g: PIXI.Graphics, timeMs: number) => void;
  zIndex?: number;
}

export function TickGraphics({ render, zIndex }: TickGraphicsProps) {
  const ref = useRef<PIXI.Graphics>(null);
  const clock = useRef(0);
  useTick((delta) => {
    clock.current += delta * MS_PER_FRAME;
    if (ref.current) render(ref.current, clock.current);
  });
  return <Graphics ref={ref} zIndex={zIndex} />;
}

interface CyclingTextProps {
  texts: string[];
  intervalMs: number;
  style: PIXI.TextStyle;
  x?: number;
  y?: number;
  anchor?: number | [number, number];
}

// Swaps a Text's content on an interval. Only re-rasterizes when the index
// actually changes, so it costs nothing between swaps.
export function CyclingText({ texts, intervalMs, style, x = 0, y = 0, anchor }: CyclingTextProps) {
  const ref = useRef<PIXI.Text>(null);
  const clock = useRef(0);
  const shown = useRef(-1);
  useTick((delta) => {
    clock.current += delta * MS_PER_FRAME;
    const i = cycleIndex(clock.current, intervalMs, texts.length);
    if (i !== shown.current && ref.current) {
      shown.current = i;
      ref.current.text = texts[i];
    }
  });
  return <Text ref={ref} text={texts[0]} style={style} x={x} y={y} anchor={anchor} />;
}
