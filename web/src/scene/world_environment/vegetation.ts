import { node, type V3, type WorldNode } from '@/scene/world/types';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { meadow } from '@/scene/world_environment/meadow';
import { forestCanopy } from '@/scene/world_environment/forest_canopy';
import { noise } from '@/scene/world_environment/terrain_noise';
import { roadNearest, roadSample, ROAD_LENGTH } from '@/scene/world_environment/road_path';

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

export function vegetationClearance(x: number, z: number, radius = 8) {
  if (templeClearance(x, z) < radius) return false;
  return z < 11 || z > 175 || Math.abs(x) > 125 || roadNearest(x, z).distance > radius;
}

export function addVegetation(root: WorldNode, road = false) {
  root.children.push(meadow(road), forestCanopy());
  let seed = 417;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Scanned crowns cover the foreground and middle slopes, with irregular
  // spacing, size and gaps. Their roots use the same graded terrain as the road.
  let detailed = 0,
    trees = 0;
  for (let attempt = 0; attempt < 2200 && trees < 260; attempt++) {
    const x = (random() - 0.5) * 250,
      z = -135 + random() * 280;
    if (!vegetationClearance(x, z, 9)) continue;
    if (Math.hypot(x, z + 16) > 142) continue;
    if (noise(x / 21, z / 21) < 0.18) continue;
    const y = terrainHeight(x, z);
    const slope = Math.hypot(terrainHeight(x + 2, z) - y, terrainHeight(x, z + 2) - y) / 2;
    if (slope > 1.35) continue;
    const near =
      detailed < 28 &&
      (Math.hypot(x, z) < 64 || (road && z > 15 && roadNearest(x, z).distance < 17));
    const tree = modelAsset(
      near ? 'tree' : 'tree_far',
      [x, y - 0.12, z],
      1.2 + random() * 1.05,
      random() * Math.PI * 2,
    );
    tree.shadow = near;
    root.children.push(tree);
    if (near) detailed++;
    trees++;
  }
  for (let i = 0; i < 160; i++) {
    const frame = roadSample(random() * ROAD_LENGTH);
    const offset = (i % 2 ? 1 : -1) * (6 + random() * 8);
    const x = road
      ? frame.position[0] + Math.cos(frame.yaw) * offset
      : (i % 2 ? 1 : -1) * (34 + random() * 12);
    const z = road ? frame.position[2] - Math.sin(frame.yaw) * offset : 9 - random() * 80;
    if (!vegetationClearance(x, z, 4.8)) continue;
    const y = terrainHeight(x, z);
    const asset = i % 5 === 0 ? 'rock' : i % 3 === 0 ? 'fern' : 'grass';
    const plant = modelAsset(
      asset + (i % 3 || ''),
      [x, y - 0.04, z],
      asset === 'rock' ? 0.8 + random() * 1.25 : 0.75 + random() * 0.8,
      random() * Math.PI * 2,
    );
    plant.shadow = asset === 'rock';
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
