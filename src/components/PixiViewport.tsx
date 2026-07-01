// Based on https://codepen.io/inlet/pen/yLVmPWv.
// Copyright (c) 2018 Patrick Brouwer, distributed under the MIT license.

import { PixiComponent, useApp } from '@pixi/react';
import { Viewport } from 'pixi-viewport';
import { Application } from 'pixi.js';
import { MutableRefObject, ReactNode } from 'react';

export type ViewportProps = {
  app: Application;
  viewportRef?: MutableRefObject<Viewport | undefined>;

  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
  // Extra headroom ABOVE the world so the camera can pan up into the "sky"
  // (where tall props like the iso billboard stand). 0 = clamp to the map box.
  clampTop?: number;
  children?: ReactNode;
};

// https://davidfig.github.io/pixi-viewport/jsdoc/Viewport.html
export default PixiComponent('Viewport', {
  create(props: ViewportProps) {
    const { app, children, viewportRef, ...viewportProps } = props;
    const viewport = new Viewport({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      events: app.renderer.events,
      passiveWheel: false,
      ...viewportProps,
    });
    if (viewportRef) {
      viewportRef.current = viewport;
    }
    // Activate plugins
    viewport
      .drag()
      .pinch({})
      .wheel()
      .decelerate()
      .clamp({
        left: 0,
        right: props.worldWidth,
        top: -(props.clampTop ?? 0),
        bottom: props.worldHeight,
        underflow: 'center',
      })
      .setZoom(-10)
      .clampZoom({
        // Fit-all based: the most zoomed-out you can go is ~the whole world
        // fitting the viewport (times a factor for a bit of extra margin). The
        // old formula scaled minScale with screenWidth only, so a wider (now
        // full-bleed) viewport forced a higher minimum zoom = the map appeared
        // bigger. This fits both dimensions and both view modes.
        minScale:
          0.7 *
          Math.min(
            props.screenWidth / props.worldWidth,
            props.screenHeight / props.worldHeight,
          ),
        maxScale: 3.0,
      });
    return viewport;
  },
  applyProps(viewport, oldProps: any, newProps: any) {
    Object.keys(newProps).forEach((p) => {
      if (
        p !== 'app' &&
        p !== 'viewportRef' &&
        p !== 'children' &&
        p !== 'clampTop' &&
        oldProps[p] !== newProps[p]
      ) {
        // @ts-expect-error Ignoring TypeScript here
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        viewport[p] = newProps[p];
      }
    });
  },
});
