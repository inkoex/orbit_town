import { Graphics } from '@pixi/react';
import { isoWorldToScreen, isoOriginX } from '../utils/isoCoords';

interface Props {
  width: number;
  height: number;
  tileDim: number;
  onpointerup?: (e: any) => void;
  onpointerdown?: (e: any) => void;
}

export function IsoDebugGrid({ width, height, tileDim, onpointerup, onpointerdown }: Props) {
  const originX = isoOriginX(height, tileDim);
  const hw = tileDim / 2;
  const hh = tileDim / 4;

  return (
    <Graphics
      interactive
      onpointerup={onpointerup}
      onpointerdown={onpointerdown}
      draw={(g) => {
        g.clear();
        g.lineStyle(1, 0x334155, 0.7);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const { x: sx, y: sy } = isoWorldToScreen({ x, y }, tileDim, originX);
            g.moveTo(sx, sy);
            g.lineTo(sx + hw, sy + hh);
            g.lineTo(sx, sy + hh * 2);
            g.lineTo(sx - hw, sy + hh);
            g.lineTo(sx, sy);
          }
        }
        // Click hit area
        g.beginFill(0x000000, 0.001);
        g.drawRect(0, 0, (width + height) * hw, (width + height) * hh);
        g.endFill();
      }}
    />
  );
}
