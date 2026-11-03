import { Builder, materials as M } from '@/scene/geometry/builder';
import type { Geometry, Material, V3 } from '@/scene/world/types';
import { carvedWindowPanel } from '@/scene/world_environment/window_carving';
import { windowTracery } from '@/scene/world_environment/window_tracery';

const timber: Material = { ...M.darkWood, color: 0x39312c, rough: 0.88 };
const recess: Material = { color: 0x1c1917, rough: 0.96 };
const wornEdge: Material = { ...M.darkWood, color: 0x75685a, rough: 0.79 };
const cache = new Map<string, Geometry>();

/** Rails with a deep rebate and a narrow, rubbed bead on the face. */
function windowFrame(b: Builder, width: number, height: number, rail: number) {
  for (const [inset, thickness, depth, z, material] of [
    [0, rail, 0.19, 0, timber],
    [rail, rail * 0.3, 0.075, 0.022, recess],
    [rail * 1.3, rail * 0.17, 0.04, 0.065, wornEdge],
  ] as const) {
    const w = width - inset * 2;
    const h = height - inset * 2;
    for (const side of [-1, 1]) {
      b.box([thickness, h, depth], [(side * (w - thickness)) / 2, 0, z], material);
      b.box([w - thickness * 2, thickness, depth], [0, (side * (h - thickness)) / 2, z], material);
    }
  }
}

/**
 * The reference's dark carved leaves and fine linked tracery share one frame.
 * Width/height are the complete outer bounds; openings remain at their authored
 * coordinates. Open garden screens have no backing, so their holes stay real.
 */
export function templeWindow(
  b: Builder,
  position: V3,
  width: number,
  height: number,
  daylight: boolean,
  yaw = 0,
  mode: 'triptych' | 'lattice' = 'triptych',
  open = false,
  distant = false,
) {
  const key = [width, height, daylight, mode, open, distant].join(':');
  let geometry = cache.get(key);
  if (!geometry) {
    const local = new Builder();
    const rail = Math.min(0.075, width * 0.045, height * 0.065);
    const inset = rail * 1.5;
    const innerWidth = width - inset * 2;
    const innerHeight = height - inset * 2;
    const mullion = Math.min(0.065, innerWidth * 0.045);
    windowFrame(local, width, height, rail);
    const carvedCount = mode === 'triptych' ? 2 : 0;
    const carvedWidth = (innerWidth - mullion * 2) * 0.29;
    const glazedWidth = innerWidth - carvedCount * (carvedWidth + mullion);
    for (let i = 0; i < carvedCount; i++) {
      const x = -innerWidth / 2 + carvedWidth / 2 + i * (carvedWidth + mullion);
      const carving = new Builder();
      carvedWindowPanel(carving, carvedWidth, innerHeight, distant);
      local.merge(carving.build(), [x, 0, 0.025]);
      const stile = x + (carvedWidth + mullion) / 2;
      local.box([mullion, innerHeight, 0.17], [stile, 0, 0], timber);
      local.box([mullion * 0.17, innerHeight, 0.018], [stile - mullion * 0.3, 0, 0.091], wornEdge);
    }
    const glazedCenter = (innerWidth - glazedWidth) / 2;
    if (!open)
      local.box([glazedWidth, innerHeight, 0.024], [glazedCenter, 0, -0.067], {
        color: daylight ? 0xa5a6a0 : 0x293b45,
        rough: 0.98,
        pattern: 2,
        glow: daylight ? 0.085 : 0.012,
      });
    const tracery = new Builder();
    windowTracery(tracery, glazedWidth, innerHeight, distant);
    local.merge(tracery.build(), [glazedCenter, 0, 0.032]);
    // A projecting lower lip catches a thin light line without gilding the wood.
    local.box([width, rail * 0.45, 0.22], [0, -height / 2 + rail * 0.225, 0.01], timber);
    geometry = local.build();
    cache.set(key, geometry);
  }
  b.merge(geometry, position, [0, yaw, 0]);
}
