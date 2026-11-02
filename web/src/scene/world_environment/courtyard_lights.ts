import { Builder, materials as M } from '@/scene/geometry/builder';
import type { V3 } from '@/scene/world/types';

export const gardenLightPositions: V3[] = [
  [-2.78, 0.365, 3.15],
  [2.86, 0.525, 0.8],
  [-2.82, 0.365, -4.4],
  [2.82, 0.585, -6.7],
];

/** Slim frosted lanterns and low stone-capped path lights from the courtyard reference. */
export function gardenLantern(b: Builder, p: V3, lit: boolean, tall = false) {
  const local = new Builder();
  const metal = { ...M.darkWood, color: 0x33382e, rough: 0.51, metal: 0.22 };
  const diffuser = { color: lit ? 0xffe1a3 : 0xe0d9ba, rough: 0.36, glow: lit ? 4.8 : 0.12 };
  if (tall) {
    local.box([0.23, 0.055, 0.23], [0, 0.03, 0], metal);
    local.box([0.145, 0.46, 0.145], [0, 0.3, 0], diffuser);
    for (const x of [-0.09, 0.09])
      for (const z of [-0.09, 0.09]) local.box([0.018, 0.67, 0.018], [x, 0.36, z], metal);
    local.box([0.2, 0.025, 0.2], [0, 0.7, 0], metal);
  } else {
    local.box([0.32, 0.07, 0.32], [0, 0.035, 0], M.stone);
    local.box([0.17, 0.34, 0.17], [0, 0.24, 0], metal);
    local.box([0.34, 0.035, 0.34], [0, 0.43, 0], metal);
    local.box([0.27, 0.15, 0.27], [0, 0.52, 0], diffuser);
    for (const x of [-0.15, 0.15])
      for (const z of [-0.15, 0.15]) local.box([0.025, 0.2, 0.025], [x, 0.52, z], metal);
    local.box([0.45, 0.065, 0.45], [0, 0.65, 0], { ...M.stone, color: 0x676b61 });
    local.box([0.3, 0.035, 0.3], [0, 0.7, 0], M.stone);
  }
  b.merge(local.build(), p);
}

export function courtyardSconce(b: Builder, position: V3, lit: boolean, yaw = 0) {
  const local = new Builder();
  local.box([0.2, 0.65, 0.1], [0, 0, 0], { ...M.darkWood, color: 0x282820 });
  local.box([0.11, 0.44, 0.075], [0, 0, 0.075], {
    color: lit ? 0xffd58b : 0xd8c8a0,
    rough: 0.38,
    glow: lit ? 4 : 0.08,
  });
  for (const y of [-0.26, 0.26]) local.box([0.16, 0.035, 0.14], [0, y, 0.045], M.brass);
  b.merge(local.build(), position, [0, yaw, 0]);
}
