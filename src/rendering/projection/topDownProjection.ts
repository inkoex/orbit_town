import type { Point, Projection } from './Projection';
import {
  worldToScreen as worldToScreenPx,
  worldToScreenCenter as worldToScreenCenterPx,
  screenToWorld as screenToWorldPx,
} from '../../utils/coords';

// Adapter over the existing top-down math in utils/coords. Keeps a single
// source of truth rather than re-deriving the formulas here.
export function createTopDownProjection(tileDim: number): Projection {
  return {
    worldToScreen: (p: Point) => worldToScreenPx(p, tileDim),
    worldToScreenCenter: (p: Point) => worldToScreenCenterPx(p, tileDim),
    screenToWorld: (p: Point) => screenToWorldPx(p, tileDim),
    viewportSize: (mapWidth: number, mapHeight: number) => ({
      width: mapWidth * tileDim,
      height: mapHeight * tileDim,
    }),
  };
}
