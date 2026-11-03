import { Builder, materials as M } from '@/scene/geometry/builder';
import type { Shape } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import { templeWindow } from '@/scene/world_environment/temple_window';
import { lotusBoss, paintedBeam } from '@/scene/world_environment/temple_ornament';
import { templeGold, templeJade, templeRed } from '@/scene/world_environment/temple_palette';

type Opening = { x: number; width: number; bottom: number; top: number; lattice?: boolean };
const plaster = { ...M.plaster, color: 0xb6aa8b, rough: 0.94 };

/** A masonry wall built around holes, never an opaque panel behind the tracery. */
export function courtyardWall(
  b: Builder,
  p: V3,
  width: number,
  height: number,
  openings: Opening[],
  yaw = 0,
) {
  const local = new Builder();
  const ordered = [...openings].sort((a, c) => a.x - c.x);
  let left = -width / 2;
  for (const opening of ordered) {
    const edge = opening.x - opening.width / 2;
    if (edge > left)
      local.box([edge - left, height, 0.25], [(left + edge) / 2, height / 2, 0], plaster);
    if (opening.bottom > 0)
      local.box([opening.width, opening.bottom, 0.25], [opening.x, opening.bottom / 2, 0], plaster);
    local.box(
      [opening.width, height - opening.top, 0.25],
      [opening.x, (height + opening.top) / 2, 0],
      plaster,
    );
    // Painted reveals articulate the opening while keeping the void unobstructed.
    for (const side of [-1, 1]) {
      const x = opening.x + side * (opening.width / 2 + 0.065);
      local.box(
        [0.13, opening.top - opening.bottom, 0.31],
        [x, (opening.top + opening.bottom) / 2, 0],
        templeRed,
      );
      local.box(
        [0.02, opening.top - opening.bottom - 0.1, 0.025],
        [x, (opening.top + opening.bottom) / 2, 0.17],
        templeGold,
      );
    }
    paintedBeam(local, [opening.x, opening.top + 0.09, 0.12], opening.width + 0.3, 0.18);
    if (opening.lattice) {
      templeWindow(
        local,
        [opening.x, (opening.top + opening.bottom) / 2, 0.015],
        opening.width,
        opening.top - opening.bottom,
        false,
        0,
        'lattice',
        true,
      );
      local.box(
        [opening.width + 0.16, 0.1, 0.38],
        [opening.x, opening.bottom - 0.015, 0.025],
        M.stone,
      );
    }
    left = opening.x + opening.width / 2;
  }
  if (left < width / 2)
    local.box([width / 2 - left, height, 0.25], [(left + width / 2) / 2, height / 2, 0], plaster);
  paintedBeam(local, [0, height - 0.15, 0.08], width, 0.28);
  paintedBeam(local, [0, height - 0.15, -0.08], width, 0.28, Math.PI);
  b.merge(local.build(), p, [0, yaw, 0]);
}

/** Circular opening cut through the plaster, with a full stone reveal. */
export function moonGate(b: Builder, p: V3, yaw = 0) {
  const local = new Builder();
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const radius = 1.28,
    cy = 1.32,
    halfWidth = 1.72,
    height = 3.22,
    thickness = 0.3;
  const angles = Array.from({ length: 49 }, (_, i) => (i * Math.PI * 2) / 48);
  for (const x of [-halfWidth, halfWidth])
    for (const y of [-cy, height - cy]) {
      let angle = Math.atan2(y, x);
      if (angle < 0) angle += Math.PI * 2;
      angles.push(angle);
    }
  angles.sort((a, c) => a - c);
  const outer = (a: number): V3 => {
    const dx = Math.cos(a),
      dy = Math.sin(a);
    const length = Math.min(
      halfWidth / Math.max(0.0001, Math.abs(dx)),
      (dy > 0 ? height - cy : cy) / Math.max(0.0001, Math.abs(dy)),
    );
    return [dx * length, cy + dy * length, 0];
  };
  for (let i = 0; i < angles.length - 1; i++) {
    const a = angles[i],
      c = angles[i + 1];
    if (c - a < 0.00001) continue;
    const innerA: V3 = [Math.cos(a) * radius, cy + Math.sin(a) * radius, 0];
    const innerC: V3 = [Math.cos(c) * radius, cy + Math.sin(c) * radius, 0];
    for (const side of [-1, 1]) {
      const first = g.positions.length / 3;
      for (const v of [innerA, outer(a), outer(c), innerC]) {
        g.positions.push(v[0], v[1], (side * thickness) / 2);
        g.normals.push(0, 0, side);
        g.uv.push(v[0], v[1]);
      }
      const order = side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      g.indices.push(...order.map((v) => first + v));
    }
    const angle = (a + c) / 2;
    local.box(
      [radius * (c - a) + 0.015, 0.13, 0.38],
      [Math.cos(angle) * (radius + 0.025), cy + Math.sin(angle) * (radius + 0.025), 0],
      templeJade,
      [0, 0, angle + Math.PI / 2],
    );
    for (const [offset, thickness, material] of [
      [0.1, 0.045, templeGold],
      [0.19, 0.12, templeRed],
    ] as const)
      local.box(
        [(radius + offset) * (c - a) + 0.015, thickness, 0.4],
        [Math.cos(angle) * (radius + offset), cy + Math.sin(angle) * (radius + offset), 0],
        material,
        [0, 0, angle + Math.PI / 2],
      );
  }
  local.add(g, plaster);
  paintedBeam(local, [0, 3.22, 0.1], 3.65, 0.2);
  for (const side of [-1, 1]) lotusBoss(local, [side * 1.31, 2.79, 0.17], 0.17);
  b.merge(local.build(), p, [0, yaw, 0]);
}
