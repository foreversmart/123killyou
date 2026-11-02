import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, plane, torus } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import { lotusBoss, paintedBeam, reliefSurface } from '@/scene/world_environment/temple_ornament';
import {
  templeRed,
  templeJade,
  templeGold,
  templeInk,
  templeCream,
  templePaint,
} from '@/scene/world_environment/temple_palette';

export const templeTimber = templeRed;
export const templeStone = { ...M.stone, color: 0x81776a, rough: 0.84 };
export const templeVermilion = templeRed;
export const templePatina = templeJade;

/** Five interlocking tiers, projecting arms and gilded end blocks carry the eaves. */
export function bracket(b: Builder, p: V3, yaw = 0, size = 1, distant = false) {
  const local = new Builder();
  for (let tier = 0; tier < 5; tier++) {
    const spread = (0.34 + tier * 0.18) * size;
    const y = tier * 0.105 * size;
    const material = tier % 2 ? templeRed : templeJade;
    local.box([spread, 0.085 * size, 0.18 * size], [0, y, 0], material);
    local.box([0.14 * size, 0.085 * size, spread], [0, y + 0.04 * size, 0], material);
    if (!distant)
      for (const side of [-1, 1]) {
        const end = side * spread * 0.42;
        local.box([0.15 * size, 0.1 * size, 0.21 * size], [end, y + 0.065 * size, 0], templeGold);
        local.box([0.19 * size, 0.1 * size, 0.14 * size], [0, y + 0.1 * size, end], templeGold);
        local.box(
          [0.19 * size, 0.065 * size, 0.16 * size],
          [end, y + 0.035 * size, 0.07 * size],
          material,
          [0, 0, side * 0.33],
        );
      }
    local.box(
      [spread * 0.9, 0.016 * size, 0.025 * size],
      [0, y - 0.037 * size, 0.103 * size],
      templeCream,
    );
  }
  local.box([0.24 * size, 0.18 * size, 0.24 * size], [0, -0.105 * size, 0], templeRed);
  if (!distant && size >= 1.1)
    local.add(
      cylinder(0.07 * size, 0.07 * size, 0.035 * size, 8),
      templeGold,
      [0, -0.02 * size, 0.17 * size],
      [1, 1, 1],
      [Math.PI / 2, 0, 0],
    );
  b.merge(local.build(), p, [0, yaw, 0]);
}

/** Repeated facade panels share the carved-wall atlas and retain a deep reveal. */
function facadePanel(b: Builder, p: V3, width: number, height: number) {
  const local = new Builder();
  local.box([width, height, 0.14], [0, height / 2, 0], templeInk);
  reliefSurface(local, [0, 0.07, 0.08], Math.max(0.1, width - 0.13), Math.max(0.1, height - 0.14));
  for (const side of [-1, 1]) {
    local.box([0.06, height, 0.2], [side * (width / 2 - 0.03), height / 2, 0.06], templeRed);
    local.box(
      [0.015, height - 0.06, 0.025],
      [side * (width / 2 - 0.074), height / 2, 0.12],
      templeGold,
    );
  }
  for (const y of [0.035, height - 0.035]) {
    local.box([width, 0.07, 0.22], [0, y, 0.06], templeJade);
    local.box([width - 0.07, 0.015, 0.025], [0, y, 0.185], templeGold);
  }
  b.merge(local.build(), p);
}

/** Framed vermilion bays carry jade lattice, inset narrative relief and gold moldings. */
export function timberBay(
  b: Builder,
  p: V3,
  width: number,
  height: number,
  yaw = 0,
  lattice = false,
) {
  const local = new Builder();
  local.box([width, height, 0.12], [0, height / 2, 0], templeInk);
  const inner = Math.max(0.28, width - 0.38);
  for (const x of [-width / 2, width / 2]) {
    local.box([0.18, height + 0.1, 0.23], [x, height / 2, 0.14], templeRed);
    local.box([0.025, height - 0.08, 0.04], [x, height / 2, 0.275], templeGold);
  }
  for (const y of [0.12, height * 0.46, height - 0.1])
    paintedBeam(local, [0, y, 0.17], width, Math.min(0.22, height * 0.08));
  facadePanel(local, [0, 0.26, 0.13], inner, Math.max(0.24, height * 0.38));
  if (lattice) {
    const top = height * 0.68;
    const latticeHeight = height * 0.29;
    local.box([inner, latticeHeight + 0.08, 0.06], [0, top, 0.16], templeInk);
    const columns = Math.max(2, Math.round(inner / 0.22));
    for (let i = 0; i <= columns; i++) {
      const x = -inner / 2 + (i * inner) / columns;
      local.box([0.035, latticeHeight, 0.075], [x, top, 0.22], templeJade);
    }
    for (const level of [-0.5, 0, 0.5])
      local.box([inner, 0.04, 0.075], [0, top + level * latticeHeight, 0.22], templeGold);
    for (let i = 0; i < columns; i++) {
      const x = -inner / 2 + ((i + 0.5) * inner) / columns;
      local.box([0.08, 0.08, 0.06], [x, top, 0.27], templeRed, [0, 0, Math.PI / 4]);
    }
  } else facadePanel(local, [0, height * 0.52, 0.13], inner, Math.max(0.2, height * 0.38));
  b.merge(local.build(), p, [0, yaw, 0]);
}

/** Lacquered leaves use recessed sculpture fields, raised rails and ring handles. */
export function ceremonialDoor(
  b: Builder,
  p: V3,
  width: number,
  height: number,
  yaw = 0,
  distant = false,
) {
  const leaf = new Builder();
  leaf.box([width, height, 0.17], [0, height / 2, 0], templeRed);
  for (const side of [-1, 1]) {
    leaf.box([0.1, height, 0.08], [side * (width / 2 - 0.055), height / 2, 0.12], templeJade);
    leaf.box(
      [0.018, height - 0.05, 0.03],
      [side * (width / 2 - 0.11), height / 2, 0.18],
      templeGold,
    );
  }
  const panelWidth = Math.max(0.23, width - 0.26);
  for (const [bottom, panelHeight] of [
    [height * 0.1, height * 0.3],
    [height * 0.54, height * 0.35],
  ])
    facadePanel(leaf, [0, bottom, 0.12], panelWidth, panelHeight);
  for (const y of [0.09, height * 0.46, height - 0.09])
    paintedBeam(leaf, [0, y, 0.15], width, Math.min(0.16, width * 0.16));
  if (!distant)
    for (const side of [-1, 1])
      for (const y of [height * 0.09, height * 0.46, height * 0.92])
        leaf.add(
          cylinder(0.032, 0.032, 0.025, 10),
          templeGold,
          [side * width * 0.34, y, 0.23],
          [1, 1, 1],
          [Math.PI / 2, 0, 0],
        );
  if (!distant) lotusBoss(leaf, [width * 0.22, height * 0.47, 0.24], width * 0.07);
  leaf.add(
    torus(width * 0.07, 0.018, distant ? 6 : 14),
    templeGold,
    [width * 0.22, height * 0.43, 0.29],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  b.merge(leaf.build(), p, [0, yaw, 0]);
}

export function balustrade(b: Builder, from: V3, to: V3, distant = false) {
  const distance = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const count = Math.max(1, Math.round(distance / 1.5));
  const yaw = -Math.atan2(to[2] - from[2], to[0] - from[0]);
  const local = new Builder();
  for (const y of [0.22, 0.74]) {
    if (distant) {
      local.box([distance, 0.1, 0.2], [0, y, 0], templeRed);
      local.add(plane(distance, 0.08), templePaint, [0, y - 0.04, 0.11]);
    } else paintedBeam(local, [0, y, 0], distance, 0.1);
  }
  for (let i = 0; i <= count; i++) {
    const x = -distance / 2 + (i * distance) / count;
    local.box([0.14, 0.92, 0.14], [x, 0.45, 0], templeRed);
    local.add(cylinder(0.1, 0.07, 0.13, 8), templeGold, [x, 0.98, 0]);
    if (i < count) {
      const mid = x + distance / count / 2;
      local.box([distance / count - 0.2, 0.36, 0.08], [mid, 0.48, 0], templeJade);
      if (distant)
        local.add(
          cylinder(0.1, 0.1, 0.025, 6),
          templeGold,
          [mid, 0.48, 0.06],
          [1, 1, 1],
          [Math.PI / 2, 0, 0],
        );
      else lotusBoss(local, [mid, 0.48, 0.06], 0.1);
    }
  }
  b.merge(local.build(), [(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2], [0, yaw, 0]);
}
