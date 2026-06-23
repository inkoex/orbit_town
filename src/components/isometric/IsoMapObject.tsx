import { Sprite } from '@pixi/react';
import type { Projection } from '../../rendering/projection/Projection';
import type { IsoAsset } from '../../../data/assets/isoSliceManifest';
import { isoDepthKey, IsoLayer } from './isoDepth';

interface Props {
  tile: { x: number; y: number };
  asset: IsoAsset;
  layer: IsoLayer;
  projection: Projection;
}

// A wall/furniture sprite anchored at its base/footprint tile. zIndex from
// isoDepthKey lets it share one sortableChildren container with the characters
// so they occlude each other correctly (a character behind the desk is hidden).
export function IsoMapObject({ tile, asset, layer, projection }: Props) {
  const pos = projection.worldToScreenCenter(tile);
  return (
    <Sprite
      image={asset.src}
      x={pos.x}
      y={pos.y}
      width={asset.displaySize.width}
      height={asset.displaySize.height}
      anchor={[asset.anchor.x, asset.anchor.y]}
      zIndex={isoDepthKey(tile, layer, 0)}
    />
  );
}
