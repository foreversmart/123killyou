import { node, type V3, type WorldNode } from '@/scene/world/types';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { meadow } from '@/scene/world_environment/meadow';
import { forestCanopy } from '@/scene/world_environment/forest_canopy';
import { CrownOccupancy, forestTrees } from '@/scene/world_environment/forest_scatter';
import { rockExposure } from '@/scene/world_environment/terrain_noise';
import { roadNearest, roadSample, ROAD_LENGTH } from '@/scene/world_environment/road_path';
import { wildflowers } from '@/scene/world_environment/wildflowers';
import { Builder, materials as M } from '@/scene/geometry/builder';
import {
  plantAsset,
  treeAsset,
  vegetationRandom,
  type TidewaterPlant,
} from '@/scene/world_environment/procedural_vegetation';

/** Rigid scanned rocks retain their original geometry; all flora uses Tidewater. */
export function modelAsset(asset: string, position: V3, scale = 1, rotation = 0) {
  const result = node(asset);
  result.asset = asset;
  result.position = position;
  result.scale = [scale, scale, scale];
  result.rotation[1] = rotation;
  return result;
}

export function vegetationClearance(x: number, z: number, radius = 8) {
  if (templeClearance(x, z) < radius) return false;
  return z < 11 || z > 175 || Math.abs(x) > 125 || roadNearest(x, z).distance > radius;
}

/** One seeded forest layout is shared by arrival, the gate and the departure. */
export function addVegetation(root: WorldNode, road = false) {
  const occupancy = new CrownOccupancy();
  const trees = forestTrees(false, occupancy, road);
  root.children.push(meadow(road), wildflowers(road), ...trees, forestCanopy(occupancy));
  const random = vegetationRandom(417);

  const understory: TidewaterPlant[] = [
    'fern',
    'shrub_0',
    'fern',
    'young_palm',
    'shrub_1',
    'monstera',
    'fern',
    'elephant_ear',
    'shrub_0',
    'banana_0',
    'fern',
    'banana_1',
  ];
  for (let i = 0; i < 280; i++) {
    const frame = roadSample(random() * ROAD_LENGTH);
    const offset = (i % 2 ? 1 : -1) * (6.4 + random() * 13);
    const x =
      i % 3
        ? frame.position[0] + Math.cos(frame.yaw) * offset
        : (i % 2 ? 1 : -1) * (35 + random() * 20);
    const z = i % 3 ? frame.position[2] - Math.sin(frame.yaw) * offset : 8 - random() * 100;
    if (!vegetationClearance(x, z, 6.1)) continue;
    const y = terrainHeight(x, z, road);
    const slope = Math.hypot(terrainHeight(x + 1, z) - y, terrainHeight(x, z + 1) - y);
    if (slope > 1.1) continue;
    if (i % 13 === 0 && rockExposure(x, z) > 0.3) {
      root.children.push(modelAsset('rock' + (i % 3 || ''), [x, y - 0.04, z], 0.8 + random(), i));
      continue;
    }
    const kind = understory[i % understory.length];
    root.children.push(
      plantAsset(kind, [x, y - 0.025, z], 0.68 + random() * 0.65, random() * Math.PI * 2),
    );
  }

  // The larger palms occupy sheltered lower bends, beside the broadleaf forest.
  for (let i = 0; i < 12; i++) {
    const frame = roadSample(35 + i * 14);
    const offset = (i % 2 ? 1 : -1) * (16 + random() * 8);
    const x = frame.position[0] + Math.cos(frame.yaw) * offset;
    const z = frame.position[2] - Math.sin(frame.yaw) * offset;
    if (!vegetationClearance(x, z, 11)) continue;
    const y = terrainHeight(x, z, road);
    if (Math.hypot(terrainHeight(x + 1, z) - y, terrainHeight(x, z + 1) - y) > 0.95) continue;
    root.children.push(plantAsset('palm', [x, y - 0.08, z], 0.8 + random() * 0.3, i * 2.399));
  }
}

export function addCourtyardGarden(root: WorldNode) {
  root.children.push(treeAsset(2, [0.4, -0.1, -10], 0.56, 0.7));
  for (let i = 0; i < 8; i++) {
    const angle = i * 2.4;
    const radius = 0.7 + (i % 3) * 0.35;
    root.children.push(
      plantAsset(
        i % 3 ? 'fern' : 'shrub_0',
        [Math.cos(angle) * radius, 0, -10 + Math.sin(angle) * radius],
        0.45,
        angle,
      ),
    );
  }
}

/** Planting stays outside the coach turning surface and the compound slab. */
export function addForecourtGarden(root: WorldNode, road = false) {
  const beds = new Builder();
  for (const side of [-1, 1] as const) {
    for (const z of [-4.6, 8.8]) {
      const x = side * 21.8;
      beds.box([3.8, 0.08, 1.45], [x, -0.1, z], { ...M.stone, color: 0x66685c });
      beds.box([3.15, 0.055, 0.95], [x, -0.055, z], { ...M.stone, color: 0x4f4d3e });
      root.children.push(
        plantAsset('fern', [x - 0.85, -0.03, z], 0.55, side * 0.7),
        plantAsset('shrub_0', [x, -0.035, z], 0.45, side),
        plantAsset(z > 0 ? 'strelitzia' : 'heliconia', [x + 0.85, -0.03, z], 0.38, side * 1.3),
      );
    }
  }
  root.children.push(beds.mesh('forecourt_planting_beds'));
  for (const [x, z, scale] of [
    [-25.5, 11.5, 0.53],
    [25.5, 11.5, 0.59],
  ] as const)
    root.children.push(
      treeAsset(x < 0 ? 0 : 2, [x, terrainHeight(x, z, road) - 0.08, z], scale, x * 0.1),
    );
}
