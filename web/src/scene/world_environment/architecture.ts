import { Builder, materials as M } from '@/scene/geometry/builder';
import { plane } from '@/scene/geometry/primitives';
import { labelTile } from '@/scene/renderer/atlas';
import { doorway } from '@/scene/world_environment/doors';
import type { V3 } from '@/scene/world/types';
import { octagonalLattice } from '@/scene/world_environment/courtyard_lattice';
import { stoneSlab } from '@/scene/geometry/stone_slab';
export { roof } from '@/scene/world_environment/tiled_roof';
export { roomShell } from '@/scene/world_environment/room_shell';

export function plaque(
  b: Builder,
  text: string,
  p: V3,
  width = 0.24,
  height = 0.35,
  yaw = 0,
  weathered = false,
) {
  const frame = weathered ? { ...M.darkWood, color: 0x403a30, rough: 0.98 } : M.darkWood;
  b.box([width + 0.04, height + 0.04, 0.055], [p[0], p[1] + height / 2, p[2] - 0.03], frame, [
    0,
    yaw,
    0,
  ]);
  b.add(
    plane(width, height),
    { color: weathered ? 0xa08d68 : 0xffffff, rough: 0.9 },
    p,
    [1, 1, 1],
    [0, yaw, 0],
    labelTile(text),
  );
}

export function floor(b: Builder, width = 12, depth = 12, surface: 'wood' | 'stone' = 'wood') {
  const base = surface === 'wood' ? M.darkWood : M.courtyardStone;
  b.box([width, 0.15, depth], [0, -0.16, -1], base);
  if (surface === 'stone') {
    courtyardPavers(b, [0, -0.05, -1], width, depth, 0.88, 1.12);
    return;
  }
  // Interior floors use long, slightly varied timber boards. The narrow gaps
  // expose the dark subfloor and keep the material reading as aged planks
  // instead of a tiled checkerboard.
  for (let x = -width / 2; x < width / 2; x += 0.86)
    for (let z = -depth / 2; z < depth / 2; z += 2.7) {
      const tone = Math.sin(x * 17 + z * 5) > 0 ? 0x66513d : 0x574534;
      b.box([0.83, 0.09, 2.64], [x + 0.43, -0.05, z + 1.32 - 1], {
        ...M.wood,
        color: tone,
      });
    }
}

/** A gridded courtyard walk with narrow dark joints and a worn perimeter. */
export function courtyardPavers(
  b: Builder,
  center: V3,
  width: number,
  depth: number,
  tileWidth = 1.25,
  tileDepth = 1.1,
) {
  const [cx, cy, cz] = center;
  b.box([width + 0.28, 0.1, depth + 0.28], [cx, cy - 0.06, cz], {
    ...M.stone,
    color: 0x565b54,
    rough: 0.98,
  });
  const rows = Math.max(1, Math.floor(depth / tileDepth));
  const columns = Math.max(1, Math.floor(width / tileWidth));
  const actualWidth = width / columns;
  const actualDepth = depth / rows;
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++) {
      const tone = 0xa4acae + (((row * 11 + column * 7) % 5) - 2) * 0x030303;
      b.add(
        stoneSlab(actualWidth - 0.032, actualDepth - 0.032),
        { ...M.courtyardStone, color: tone },
        [
          cx - width / 2 + actualWidth * (column + 0.5),
          cy,
          cz - depth / 2 + actualDepth * (row + 0.5),
        ],
      );
    }
}

export function table(b: Builder, p: V3, width = 2.5, depth = 1.1, height = 0.82) {
  for (let i = 0; i < 5; i++)
    b.box(
      [width, 0.1, depth / 5 - 0.006],
      [p[0], p[1] + height, p[2] - depth / 2 + ((i + 0.5) * depth) / 5],
      M.wood,
    );
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      b.box(
        [0.12, height, 0.12],
        [p[0] + x * (width / 2 - 0.14), p[1] + height / 2, p[2] + z * (depth / 2 - 0.1)],
        M.darkWood,
      );
    }
  b.box(
    [width - 0.2, 0.18, 0.08],
    [p[0], p[1] + height - 0.15, p[2] + depth / 2 - 0.1],
    M.darkWood,
  );
}

export function windowLattice(
  b: Builder,
  x: number,
  y: number,
  z: number,
  width = 1.8,
  height = 1.65,
  lit = false,
  yaw = 0,
) {
  b.box(
    [width, height, 0.035],
    [x, y, z],
    {
      color: lit ? 0xc7cec7 : 0x77848a,
      rough: 0.94,
      glow: lit ? 0.12 : 0.015,
    },
    [0, yaw, 0],
  );
  octagonalLattice(b, [x, y, z], width, height, yaw);
}

export function door(b: Builder, p: V3, label = '门', open = false, weatheredPlaque = false) {
  doorway(b, p, open);
  plaque(b, label, [p[0], p[1] + 2.61, p[2] + 0.1], 0.24, 0.35, 0, weatheredPlaque);
}
