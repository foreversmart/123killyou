import { Builder, materials as M } from '@/scene/geometry/builder';
import { plane } from '@/scene/geometry/primitives';
import { plaqueLabelTile } from '@/scene/renderer/atlas';
import { doorway } from '@/scene/world_environment/doors';
import type { V3 } from '@/scene/world/types';
import { templeWindow } from '@/scene/world_environment/temple_window';
import { stoneSlab } from '@/scene/geometry/stone_slab';
import { carvedLine } from '@/scene/world_environment/temple_carving';
import { cloudScroll, lotusBoss } from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade, templeRed } from '@/scene/world_environment/temple_palette';
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
  compact = false,
) {
  const local = new Builder();
  const ornate =
    !compact && (width >= 1.3 || width * height >= 1.4 || (width >= 0.5 && height >= 0.8));
  const wood = {
    ...M.darkWood,
    color: weathered ? 0x62443f : 0x5b2934,
    rough: weathered ? 0.96 : 0.9,
    pattern: 1,
  };
  const shadowWood = { ...M.darkWood, color: 0x281b20, rough: 0.97, pattern: 1 };
  const gold = {
    ...templeGold,
    color: weathered ? 0xa08459 : 0xd0a85c,
    rough: 0.48,
    metal: 0.58,
    pattern: weathered ? 5 : 41,
  };
  const outerWidth = width + (ornate ? width * 0.24 : 0.12);
  const outerHeight = height + (ornate ? height * 0.28 : 0.12);

  // A recessed wine-red board and a proud dark backing establish the same
  // layered silhouette as the reference plaque before the ornament is added.
  local.box(
    [outerWidth, outerHeight, 0.12],
    [0, outerHeight / 2 - (outerHeight - height) * 0.5, -0.09],
    shadowWood,
  );
  local.box([width + 0.035, height + 0.035, 0.16], [0, height / 2, 0], wood);
  local.box([width - 0.08, height - 0.08, 0.035], [0, height / 2, 0.095], {
    ...wood,
    color: weathered ? 0x704d4a : 0x662f3a,
    rough: 0.94,
  });

  // Double gilded rails read as a real moulding at oblique camera angles.
  const rail = ornate ? 0.035 : 0.022;
  for (const side of [-1, 1]) {
    local.box([rail, height + 0.07, 0.055], [side * (width / 2 + 0.035), height / 2, 0.13], gold);
    local.box(
      [rail * 0.42, height - 0.04, 0.06],
      [side * (width / 2 - 0.035), height / 2, 0.155],
      gold,
    );
  }
  for (const side of [-1, 1]) {
    local.box([width + 0.07, rail, 0.055], [0, side < 0 ? 0.015 : height - 0.015, 0.13], gold);
    local.box(
      [width - 0.04, rail * 0.42, 0.06],
      [0, side < 0 ? 0.065 : height - 0.065, 0.155],
      gold,
    );
  }

  const labelWidth = Math.max(0.16, width * (ornate ? 0.82 : 0.78));
  const labelHeight = Math.max(0.18, height * (ornate ? 0.78 : 0.74));
  local.add(
    plane(labelWidth, labelHeight),
    { color: 0xffffff, rough: 0.78, metal: 0.18 },
    [0, height * 0.11, 0.185],
    [1, 1, 1],
    [0, 0, 0],
    plaqueLabelTile(text),
  );

  if (ornate) {
    // Two slim raised coils stand in for the side dragons without introducing
    // a second texture atlas: the gold ridge, red inset and cloud bosses give
    // the same sculptural rhythm while staying cheap on distant architecture.
    for (const side of [-1, 1]) {
      const points: V3[] = Array.from({ length: 13 }, (_, index) => {
        const t = index / 12;
        return [
          side * (width * 0.57 + Math.sin(t * Math.PI * 2.2) * width * 0.055),
          height * (0.08 + t * 0.84),
          0.19,
        ];
      });
      carvedLine(local, points, Math.max(0.012, Math.min(0.034, width * 0.018)), gold);
      carvedLine(
        local,
        points.map(([x, y, z]) => [x, y, z - 0.035]),
        Math.max(0.008, Math.min(0.02, width * 0.01)),
        templeRed,
      );
      cloudScroll(local, [side * width * 0.55, height * 0.77, 0.205], Math.max(0.12, width * 0.11));
    }
    cloudScroll(local, [0, height * 1.04, 0.205], Math.max(0.16, width * 0.18));
    cloudScroll(local, [0, -0.045, 0.205], Math.max(0.14, width * 0.16));
    local.ball(
      [Math.max(0.05, width * 0.055), Math.max(0.05, width * 0.055), Math.max(0.04, width * 0.045)],
      [0, height * 1.08, 0.24],
      gold,
    );
    for (const side of [-1, 1])
      local.rod(
        [side * width * 0.055, height * 1.08, 0.23],
        [side * width * 0.15, height * 1.16, 0.22],
        Math.max(0.008, width * 0.009),
        gold,
      );
    for (const wave of [0, 1, 2]) {
      const points: V3[] = Array.from({ length: 9 }, (_, index) => {
        const t = index / 8;
        return [
          (t - 0.5) * width * 0.86,
          -0.07 + wave * 0.035 + Math.sin(t * Math.PI * 2 + wave) * 0.025,
          0.195 + wave * 0.004,
        ];
      });
      carvedLine(
        local,
        points,
        Math.max(0.007, Math.min(0.018, width * 0.008)),
        wave === 1 ? templeGold : templeJade,
      );
    }
    lotusBoss(local, [0, -0.035, 0.19], Math.max(0.06, Math.min(0.18, width * 0.065)));
    lotusBoss(local, [0, height + 0.035, 0.19], Math.max(0.06, Math.min(0.18, width * 0.065)));
  }
  b.merge(local.build(), [p[0], p[1], p[2]], [0, yaw, 0]);
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
  templeWindow(b, [x, y, z], width, height, lit, yaw, height < 1.1 ? 'lattice' : 'triptych');
}

export function door(b: Builder, p: V3, label = '门', open = false, weatheredPlaque = false) {
  doorway(b, p, open);
  plaque(b, label, [p[0], p[1] + 2.61, p[2] + 0.1], 0.24, 0.35, 0, weatheredPlaque);
}
