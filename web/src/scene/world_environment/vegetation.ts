import { node, type V3, type WorldNode } from '@/scene/world/types';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { meadow } from '@/scene/world_environment/meadow';
import { forestCanopy } from '@/scene/world_environment/forest_canopy';
import { noise, rockExposure } from '@/scene/world_environment/terrain_noise';
import { roadNearest, roadSample, ROAD_LENGTH } from '@/scene/world_environment/road_path';
import { wildflowers } from '@/scene/world_environment/wildflowers';
import { Builder, materials as M } from '@/scene/geometry/builder';
import { proceduralTree, type TreeVariant } from '@/scene/world_environment/procedural_vegetation';

export function modelAsset(asset: string, position: V3, scale = 1, rotation = 0) {
  const result = node(asset);
  result.asset = asset;
  result.position = position;
  result.scale = [scale, scale, scale];
  result.rotation[1] = rotation;
  result.wind = asset.startsWith('tree')
    ? 0.85
    : asset.startsWith('grass')
      ? 1.25
      : asset.startsWith('fern')
        ? 0.65
        : 0;
  return result;
}

function placeProceduralTree(
  root: WorldNode,
  variant: TreeVariant,
  position: V3,
  scale: number,
  rotation: number,
) {
  const tree = proceduralTree(variant, scale, rotation);
  tree.position = position;
  root.children.push(tree);
}

export function vegetationClearance(x: number, z: number, radius = 8) {
  if (templeClearance(x, z) < radius) return false;
  return z < 11 || z > 175 || Math.abs(x) > 125 || roadNearest(x, z).distance > radius;
}

export function addVegetation(root: WorldNode, road = false) {
  root.children.push(meadow(road), wildflowers(road), forestCanopy());
  let seed = 417;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Scanned crowns cover the foreground and middle slopes, with irregular
  // spacing, size and gaps. Their roots use the same graded terrain as the road.
  let detailed = 0,
    trees = 0;
  for (let attempt = 0; attempt < 2500 && trees < 300; attempt++) {
    const x = (random() - 0.5) * 250,
      z = -135 + random() * 280;
    if (!vegetationClearance(x, z, 9)) continue;
    if (Math.hypot(x, z + 16) > 142) continue;
    if (noise(x / 21, z / 21) < 0.18) continue;
    const y = terrainHeight(x, z, road);
    const slope = Math.hypot(terrainHeight(x + 2, z) - y, terrainHeight(x, z + 2) - y) / 2;
    if (slope > 1.35) continue;
    // Keep the authored crowns in the camera's readable band. The scanned
    // tree mesh is useful as a distant silhouette, but repeating it through
    // the near verge makes the forest look like one species.
    const near =
      detailed < (road ? 136 : 140) &&
      (Math.hypot(x, z) < 126 || (road && z > 15 && roadNearest(x, z).distance < 34));
    // Keep the opening's near verge varied without making the species pattern
    // repeat in a visible row: broadleaf, conifer, willow, columnar, rain tree
    // and low shrub each occupy a different ecological niche.
    const kind = (((attempt * 7 + Math.floor(x * 0.4) + Math.floor(z * 0.17)) % 17) + 17) % 17;
    const variant: TreeVariant =
      kind < 4
        ? 'broadleaf'
        : kind < 7
          ? 'conifer'
          : kind < 9
            ? 'willow'
            : kind < 12
              ? 'columnar'
              : kind < 15
                ? 'rain_tree'
                : 'shrub';
    if (near) {
      placeProceduralTree(
        root,
        variant,
        [x, y - 0.12, z],
        variant === 'shrub'
          ? 0.72 + random() * 0.48
          : variant === 'columnar' || variant === 'conifer'
            ? 0.88 + random() * 0.58
            : 0.92 + random() * 0.68,
        random() * Math.PI * 2,
      );
      detailed++;
    } else {
      const asset =
        attempt % 5 === 0
          ? 'tree'
          : attempt % 3 === 0
            ? 'tree_far'
            : attempt % 2
              ? 'tree_far'
              : 'tree';
      const tree = modelAsset(
        asset,
        [x, y - 0.12, z],
        1.0 + random() * 0.95,
        random() * Math.PI * 2,
      );
      tree.shadow = false;
      root.children.push(tree);
    }
    trees++;
  }
  for (let i = 0; i < 230; i++) {
    const frame = roadSample(random() * ROAD_LENGTH);
    const offset = (i % 2 ? 1 : -1) * (6 + random() * 8);
    const x = road
      ? frame.position[0] + Math.cos(frame.yaw) * offset
      : (i % 2 ? 1 : -1) * (34 + random() * 12);
    const z = road ? frame.position[2] - Math.sin(frame.yaw) * offset : 9 - random() * 80;
    if (!vegetationClearance(x, z, 4.8)) continue;
    const y = terrainHeight(x, z, road);
    const asset =
      i % 11 === 0
        ? 'rock' + (i % 3 || '')
        : i % 4 === 0
          ? 'fern' + (i % 3 || '')
          : 'grass' + (i % 3 || '');
    if (asset.startsWith('rock') && rockExposure(x, z) < 0.3) continue;
    const plant = modelAsset(
      asset,
      [x, y - 0.04, z],
      asset.startsWith('rock') ? 0.8 + random() * 1.25 : 0.72 + random() * 0.92,
      random() * Math.PI * 2,
    );
    plant.shadow = asset.startsWith('rock');
    root.children.push(plant);
  }
}

export function addCourtyardGarden(root: WorldNode) {
  root.children.push(modelAsset('tree', [0.4, -0.1, -10], 1.15, 0.7));
  for (let i = 0; i < 14; i++) {
    const angle = i * 2.4,
      radius = 0.5 + (i % 4) * 0.3;
    root.children.push(
      modelAsset(
        i % 3 ? 'grass' : 'fern',
        [Math.cos(angle) * radius, 0, -10 + Math.sin(angle) * radius],
        0.6,
        angle,
      ),
    );
  }
}

/** Low planting beds soften the paved forecourt's outer edge where it meets
 * the mountain shoulder.  They sit outside the coach turning surface and the
 * compound slab, leaving a clear walking line through the gate. */
export function addForecourtGarden(root: WorldNode, road = false) {
  const beds = new Builder();
  for (const side of [-1, 1] as const) {
    for (const z of [-4.6, 8.8]) {
      const x = side * 21.8;
      beds.box([3.8, 0.08, 1.45], [x, -0.1, z], { ...M.stone, color: 0x66685c });
      beds.box([3.15, 0.055, 0.95], [x, -0.055, z], { ...M.stone, color: 0x4f4d3e });
    }
  }
  root.children.push(beds.mesh('forecourt_planting_beds'));

  const plants: Array<[number, number, string, number]> = [
    [-22.4, -4.6, 'fern', 0.75],
    [-21.5, -4.45, 'grass2', 0.7],
    [22.2, -4.55, 'grass', 0.72],
    [21.3, -4.4, 'fern', 0.7],
    [-22.5, 8.8, 'grass1', 0.78],
    [-21.4, 8.85, 'fern', 0.72],
    [22.4, 8.8, 'fern', 0.76],
    [21.3, 8.85, 'grass2', 0.75],
  ];
  for (const [x, z, asset, scale] of plants)
    root.children.push(
      modelAsset(asset, [x, terrainHeight(x, z, road) - 0.035, z], scale, x * 0.17),
    );

  // A pair of small trees frame the approach and visually continue the forest
  // line without narrowing the road or hiding the gate plaque.
  for (const [x, z, scale] of [
    [-25.5, 11.5, 1.05],
    [25.5, 11.5, 1.12],
  ] as const) {
    const y = terrainHeight(x, z, road);
    const tree = modelAsset('tree', [x, y - 0.12, z], scale, x < 0 ? 0.35 : -0.35);
    tree.shadow = true;
    root.children.push(tree);
  }
}
