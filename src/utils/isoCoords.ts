import type { Pos } from './coords';

// Pure isometric coordinate math — no import.meta references (Jest-safe).
// ISO_DEBUG flag lives in src/config/debug.ts (Vite-only).

export function isoOriginX(mapHeight: number, tileDim: number): number {
  return mapHeight * (tileDim / 2);
}

export function isoWorldToScreen(pos: Pos, tileDim: number, originX: number): Pos {
  return {
    x: (pos.x - pos.y) * (tileDim / 2) + originX,
    y: (pos.x + pos.y) * (tileDim / 4),
  };
}

export function isoWorldToScreenCenter(pos: Pos, tileDim: number, originX: number): Pos {
  const base = isoWorldToScreen(pos, tileDim, originX);
  return { x: base.x, y: base.y + tileDim / 4 };
}

export function isoScreenToWorld(px: Pos, tileDim: number, originX: number): Pos {
  const hw = tileDim / 2;
  const hh = tileDim / 4;
  const adjX = px.x - originX;
  return {
    x: (adjX / hw + px.y / hh) / 2,
    y: (px.y / hh - adjX / hw) / 2,
  };
}

export function isoViewportSize(
  mapWidth: number,
  mapHeight: number,
  tileDim: number,
): { width: number; height: number } {
  return {
    width: (mapWidth + mapHeight) * (tileDim / 2),
    height: (mapWidth + mapHeight) * (tileDim / 4),
  };
}
