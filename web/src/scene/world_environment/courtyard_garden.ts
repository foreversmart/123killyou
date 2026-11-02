import { Builder, materials as M } from '@/scene/geometry/builder';
import { stoneSlab } from '@/scene/geometry/stone_slab';
import { node, type WorldNode } from '@/scene/world/types';
import {
  gardenBamboo,
  gardenGrass,
  gardenShrub,
} from '@/scene/world_environment/courtyard_planting';
import { gardenLantern, gardenLightPositions } from '@/scene/world_environment/courtyard_lights';
import { modelAsset } from '@/scene/world_environment/vegetation';
import { courtyardWall } from '@/scene/world_environment/courtyard_walls';

const bedding = { ...M.stone, color: 0x434a43, rough: 0.98 };
const paleStone = { ...M.courtyardStone, color: 0xb3b5a8, rough: 0.64 };

/** The shared wet stone axis stays clear for every authored walk and prop. */
export function courtyardGround(b: Builder) {
  b.box([11.2, 0.14, 17], [0, -0.12, -0.3], bedding);
  for (let row = 0; row < 23; row++)
    for (let col = 0; col < 8; col++) {
      const shade = 0xa0a7a4 + (((row * 7 + col * 3) % 5) - 2) * 0x030303;
      b.add(
        stoneSlab(0.642, 0.664, 0.055),
        {
          ...M.courtyardStone,
          color: shade,
          rough: 0.44 + ((row + col) % 3) * 0.035,
        },
        [-2.31 + col * 0.66, -0.025, 7.25 - row * 0.69],
      );
    }
  for (const side of [-1, 1]) {
    b.box([0.12, 0.055, 16], [side * 2.69, -0.022, -0.3], { ...M.stone, color: 0x5c645c });
    for (let row = 0; row < 23; row++)
      for (let col = 0; col < 4; col++)
        b.box(
          [0.66, 0.05, 0.665],
          [side * (3.08 + col * 0.68), -0.025, 7.25 - row * 0.69],
          paleStone,
        );
  }
}

/** Small S-shaped garden walks use an inset dark border and separately laid stones. */
function curvedWalk(b: Builder, side: number) {
  const samples = 26;
  const point = (t: number): [number, number] => [
    side * (3.5 + Math.sin(t * Math.PI * 2) * 0.28),
    4.75 - t * 3.8,
  ];
  for (let i = 0; i < samples; i++) {
    const a = point(i / samples),
      c = point((i + 1) / samples);
    const length = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const angle = -Math.atan2(c[1] - a[1], c[0] - a[0]);
    b.box(
      [length + 0.025, 0.055, 0.75],
      [(a[0] + c[0]) / 2, 0.066, (a[1] + c[1]) / 2],
      { ...M.stone, color: 0x6c6a56 },
      [0, angle, 0],
    );
    b.box([length - 0.008, 0.018, 0.55], [(a[0] + c[0]) / 2, 0.093, (a[1] + c[1]) / 2], paleStone, [
      0,
      angle,
      0,
    ]);
  }
}

export function courtyardGarden(daylight: boolean): WorldNode {
  const root = node('courtyard_garden');
  const hardscape = new Builder(),
    plants = new Builder();
  for (const side of [-1, 1]) {
    for (const [z, depth] of [
      [3.15, 3.7],
      [-4.05, 1.75],
      [-7.03, 0.65],
    ]) {
      hardscape.box([1.65, 0.075, depth + 0.12], [side * 3.57, 0.007, z], bedding);
      hardscape.box([1.47, 0.045, depth], [side * 3.57, 0.04, z], {
        ...M.courtGrass,
        color: 0x3f4b30,
      });
      gardenGrass(plants, side * 3.57, z, 1.4, depth - 0.08, (px, pz) => {
        const t = (4.75 - pz) / 3.8;
        return (
          t >= 0 && t <= 1 && Math.abs(px - side * (3.5 + Math.sin(t * Math.PI * 2) * 0.28)) < 0.4
        );
      });
    }
    curvedWalk(hardscape, side);
    gardenShrub(plants, [side * 4.05, 0.06, 1.65], 0.57, true);
    gardenShrub(plants, [side * 3.87, 0.06, 4.37], 0.42);
    gardenShrub(plants, [side * 3.7, 0.06, -4.16], 0.62, side > 0);
    gardenBamboo(plants, [side * 4.66, 0.02, -6.95], side > 0 ? 2.8 : 2.5);
    gardenBamboo(plants, [side * 5.05, 0.02, 5.8], 2.7);
    for (const [x, z, size] of [
      [3.08, -4.56, 0.4],
      [4.03, -3.62, 0.5],
      [3.18, 4.62, 0.31],
    ])
      root.children.push(modelAsset('rock', [side * x, 0.015, z], size, side * z));
    root.children.push(modelAsset('fern', [side * 4.28, 0.04, -3.45], 0.46, side));
    gardenLantern(hardscape, [side * 4.45, 0.02, 4.05], !daylight, true);
  }
  gardenLightPositions.forEach(([x, y, z], i) =>
    gardenLantern(hardscape, [x, y - (i % 2 === 0 ? 0.3 : 0.52), z], !daylight, i % 2 === 0),
  );
  // A real pocket garden is visible through the moon door on the eastern wall.
  hardscape.box([3.5, 0.12, 5.5], [7.35, -0.07, 3.3], { ...M.courtGrass, color: 0x3c4a2d });
  courtyardWall(
    hardscape,
    [9.1, 0, 3.3],
    5.5,
    3.3,
    [{ x: 0.65, width: 1.7, bottom: 1.05, top: 2.65, lattice: true }],
    -Math.PI / 2,
  );
  for (let i = 0; i < 7; i++)
    hardscape.box(
      [0.42, 0.06, 0.9],
      [5.9 + i * 0.43, 0.005, 3.1 + Math.sin(i * 0.55) * 0.32],
      paleStone,
    );
  gardenBamboo(plants, [8.4, 0, 4.8], 3.1);
  gardenShrub(plants, [7.75, 0.02, 1.65], 0.65, true);
  root.children.push(modelAsset('rock1', [8.4, 0, 2.1], 0.55, 0.3));
  root.children.push(modelAsset('tree_far', [-4.6, -0.1, -10.8], 0.85, 0.8));
  root.children.push(modelAsset('tree_far', [5.3, -0.1, -11.5], 0.9, 1.7));
  root.children.push(hardscape.mesh('courtyard_paths_and_lights'));
  const greenery = plants.mesh('courtyard_bamboo_and_azaleas');
  greenery.wind = 0.35;
  root.children.push(greenery);
  return root;
}
