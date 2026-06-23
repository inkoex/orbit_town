import type { Point, Projection } from './Projection';
import {
  isoWorldToScreen,
  isoWorldToScreenCenter,
  isoScreenToWorld,
  isoViewportSize,
} from '../../utils/isoCoords';

export type IsoProjectionConfig = {
  tileWidth: number;
  tileHeight: number;
  originX: number;
  originY: number;
};

// Adapter over the single source of iso math in utils/isoCoords (the same
// module #iso-debug uses). The existing helpers model a 2:1 diamond with
// `tileDim` = tile width and an implicit height of tileDim/2, so they already
// match tileWidth/tileHeight when tileHeight === tileWidth / 2. This adapter
// only adds the vertical originY offset that the existing helpers omit, so the
// product view and the debug grid can never drift apart.
export function createIsoProjection({
  tileWidth,
  originX,
  originY,
}: IsoProjectionConfig): Projection {
  return {
    worldToScreen(p: Point) {
      const s = isoWorldToScreen(p, tileWidth, originX);
      return { x: s.x, y: s.y + originY };
    },
    worldToScreenCenter(p: Point) {
      const s = isoWorldToScreenCenter(p, tileWidth, originX);
      return { x: s.x, y: s.y + originY };
    },
    screenToWorld(p: Point) {
      return isoScreenToWorld({ x: p.x, y: p.y - originY }, tileWidth, originX);
    },
    viewportSize(mapWidth: number, mapHeight: number) {
      return isoViewportSize(mapWidth, mapHeight, tileWidth);
    },
  };
}
