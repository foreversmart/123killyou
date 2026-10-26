import type { SceneComposition } from './types';

/** Paint an illustration once, without actor motion or independently swapped props. */
export function completeScene(src: string, id = 'background'): SceneComposition {
  const width = 1672;
  const height = 941;
  return {
    width,
    height,
    layers: [
      {
        id,
        src,
        imageWidth: width,
        imageHeight: height,
        frame: { x: 0, y: 0, width, height },
        rect: { x: 0, y: 0, width, height },
        zIndex: 0,
      },
    ],
    labels: [],
  };
}
