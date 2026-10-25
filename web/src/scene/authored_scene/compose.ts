import type { AuthoredLayout, SceneComposition } from './types';

/** Resolve a source PNG path relative to its layout into the matching runtime WebP. */
export function runtimeSource(directory: string, path: string): string {
  const url = new URL(path, `https://assets.invalid/scenes/${directory}/`);
  return `/art/story${url.pathname.replace(/\.png$/, '.webp')}`;
}

/** sourceFrame is a pixel crop, while rect is its destination on the authored canvas. */
export function composeLayout(
  layout: AuthoredLayout,
  directory: string,
  selection: Record<string, string | boolean> = {},
): SceneComposition {
  const state = { ...layout.defaultState, ...selection };
  return {
    ...layout.coordinateSpace,
    layers: layout.layers
      .filter((layer) =>
        Object.entries(layer.visibleWhen || {}).every(([key, value]) => state[key] === value),
      )
      .map((layer) => {
        const sprite = layout.sprites[layer.sprite];
        return {
          id: layer.id,
          src: runtimeSource(directory, sprite.path),
          imageWidth: sprite.width,
          imageHeight: sprite.height,
          frame: sprite.sourceFrame || { x: 0, y: 0, width: sprite.width, height: sprite.height },
          rect: { ...layer.rect },
          zIndex: layer.zIndex,
          clipRect: layer.clipRect,
        };
      })
      .sort((a, b) => a.zIndex - b.zIndex),
    labels: (layout.labels || []).map((label) => ({ ...label })),
  };
}
