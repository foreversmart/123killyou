import { node, type V3, type WorldNode } from '@/scene/world/types';
import { terrainHeight } from '@/scene/world_environment/terrain';
import { meadow } from '@/scene/world_environment/meadow';

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

export function addVegetation(root: WorldNode, road = false) {
  root.children.push(meadow(road));
  let seed = 417;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 72; i++) {
    const x = (random() - 0.5) * 115,
      z = -40 - random() * 75;
    if (road && Math.abs(x - Math.sin(z * 0.035) * 4) < 6) continue;
    const distant = modelAsset(
      'tree_far',
      [x, terrainHeight(x, z, road), z],
      1.1 + random() * 1.1,
      random() * 6.28,
    );
    distant.shadow = false;
    root.children.push(distant);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const x = side * (10.5 + random() * 15),
        z = 7 - i * 5 + random() * 2;
      root.children.push(
        modelAsset(
          'tree',
          [x, terrainHeight(x, z, road), z],
          0.85 + random() * 0.95,
          random() * Math.PI * 2,
        ),
      );
    }
    for (let i = 0; i < 48; i++) {
      const x = side * ((road ? 4.5 : 8.8) + random() * 8),
        z = 10 - random() * 40;
      const asset = i % 5 === 0 ? 'fern' : 'grass';
      const plant = modelAsset(
        asset + (i % 3 || ''),
        [x, terrainHeight(x, z, road), z],
        0.6 + random() * 0.7,
        random() * 6.28,
      );
      const phase = random() * 6.28;
      plant.animate = (t) => {
        plant.rotation[2] = Math.sin(t * 1.1 + phase) * 0.018;
      };
      root.children.push(plant);
    }
    for (let i = 0; i < 7; i++) {
      const x = side * (9 + random() * 13),
        z = 5 - i * 5;
      root.children.push(
        modelAsset(
          'rock' + (i % 3 || ''),
          [x, terrainHeight(x, z, road) - 0.08, z],
          0.6 + random() * 1.1,
          random() * 6.28,
        ),
      );
    }
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
