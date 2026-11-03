import type { V3, WorldNode } from '@/scene/world/types';
import { plantAsset } from '@/scene/world_environment/procedural_vegetation';

/** Small versions of the same shrubs and flowers used outside the enclosure. */
export function gardenShrub(root: WorldNode, p: V3, radius: number, flowers = false) {
  root.children.push(plantAsset(flowers ? 'shrub_1' : 'shrub_0', p, radius * 0.7, p[2] * 1.7));
  if (flowers)
    root.children.push(
      plantAsset(
        'heliconia',
        [p[0] + radius * 0.35, p[1], p[2] - radius * 0.2],
        radius * 0.4,
        p[0],
      ),
    );
}

/** Original young palms replace the previous hand-built bamboo sprays. */
export function gardenPalm(root: WorldNode, p: V3, height = 2.6) {
  root.children.push(plantAsset('young_palm', p, height / 4.2, p[0] * 0.37 + p[2]));
}

/** Flat courtyard cells retain the original blades without terrain grading. */
export function gardenGrass(
  root: WorldNode,
  x: number,
  z: number,
  width: number,
  depth: number,
  ground = 0.065,
) {
  const scale = 0.22;
  const cell = 8 * scale;
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(depth / cell);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const grass = plantAsset(
        'grass_patch',
        [x - width / 2 + col * cell, ground, z - depth / 2 + row * cell],
        scale,
      );
      grass.vegetationClip = [
        0,
        0,
        Math.min(8, (width - col * cell) / scale),
        Math.min(8, (depth - row * cell) / scale),
      ];
      grass.wind = 0.7;
      root.children.push(grass);
    }
}
