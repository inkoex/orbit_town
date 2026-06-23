export type Point = { x: number; y: number };

// A view-mode-agnostic mapping between world tile coordinates and screen pixels.
// Game logic always works in world coordinates; only rendering and click
// inverse-transforms go through a Projection.
export type Projection = {
  worldToScreen(position: Point): Point;
  worldToScreenCenter(position: Point): Point;
  screenToWorld(position: Point): Point;
  viewportSize(mapWidth: number, mapHeight: number): {
    width: number;
    height: number;
  };
};

// Isometric tile metrics. A 2:1 diamond has tileHeight === tileWidth / 2.
export type IsoMetrics = {
  tileWidth: number;
  tileHeight: number;
  originX: number;
  originY: number;
};
