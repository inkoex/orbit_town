export interface Pos { x: number; y: number }

// Top-down projection. iso 전환 시 이 두 함수의 구현을 교체한다.
// 교체만으로는 부족 — origin 보정·bounds·viewport·iso 타일셋도 필요(하단 참조)
export function worldToScreen(pos: Pos, tileDim: number): Pos {
  return { x: pos.x * tileDim, y: pos.y * tileDim };
}

export function worldToScreenCenter(pos: Pos, tileDim: number): Pos {
  return { x: pos.x * tileDim + tileDim / 2, y: pos.y * tileDim + tileDim / 2 };
}

export function screenToWorld(px: Pos, tileDim: number): Pos {
  return { x: px.x / tileDim, y: px.y / tileDim };
}

export function tilesToPx(tiles: number, tileDim: number): number {
  return tiles * tileDim;
}
