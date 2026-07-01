import { useCallback, useRef, useState } from 'react';

export type Size = { width: number; height: number };

// Measures an element's actual box via ResizeObserver, so it re-fires on ANY
// size change — window resize, flex/layout reflow (e.g. a side panel opening
// and shrinking the map area), or a dev-time HMR structural edit — not only on
// window `resize` like usehooks-ts's deprecated useElementSize. That matters
// here because the iso map's available space can change without the window
// changing at all. Returns a callback ref (re-observes if the node is
// recreated) plus the live size.
export function useResizeObserver<T extends HTMLElement>(): [
  (node: T | null) => void,
  Size,
] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    if (!node) {
      return;
    }
    const measure = () => setSize({ width: node.offsetWidth, height: node.offsetHeight });
    measure(); // initial synchronous measurement
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    observerRef.current = ro;
  }, []);

  return [ref, size];
}
