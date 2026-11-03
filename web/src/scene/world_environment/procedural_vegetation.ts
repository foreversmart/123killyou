import { node, type V3 } from '@/scene/world/types';

export type TidewaterPlant =
  | `tree_${0 | 1 | 2 | 3}`
  | `shrub_${0 | 1}`
  | 'palm'
  | 'young_palm'
  | 'fern'
  | `banana_${0 | 1}`
  | 'monstera'
  | 'elephant_ear'
  | 'heliconia'
  | 'strelitzia'
  | 'grass_patch';

/** Tidewater's original local-space meshes are shared by every planted instance. */
export function plantAsset(kind: TidewaterPlant, position: V3, scale = 1, rotation = 0) {
  const result = node('tidewater_' + kind);
  result.asset = result.name;
  result.position = position;
  result.scale = [scale, scale, scale];
  result.rotation[1] = rotation;
  result.wind = kind.startsWith('tree') || kind === 'palm' ? 1 : 0.8;
  result.shadow = kind.startsWith('tree') || kind === 'palm' || kind.startsWith('banana');
  return result;
}

export function treeAsset(variant: number, position: V3, scale = 1, rotation = 0) {
  return plantAsset(`tree_${(variant % 4) as 0 | 1 | 2 | 3}`, position, scale, rotation);
}

export function vegetationRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
