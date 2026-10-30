import { Builder, materials as M } from '@/scene/geometry/builder';
import { camera } from '@/scene/world_prop/household';
import type { Identity } from '@/scene/world_character/identity';

export function accessories(id: Identity) {
  const b = new Builder();
  if (id === 'linlan') {
    camera(b, [0, 1.03, 0.19]);
    for (const s of [-1, 1]) b.rod([s * 0.09, 1.37, 0.08], [s * 0.07, 1.06, 0.18], 0.009, M.black);
  } else {
    const fabric = { color: id === 'xuzhi' ? 0xc5bda2 : 0x514c3e, rough: 0.95, pattern: 2 };
    b.box([0.19, 0.26, 0.1], [0.26, 0.88, -0.01], fabric);
    b.rod([-0.12, 1.35, 0.1], [0.25, 0.94, 0.15], 0.014, fabric);
    if (id === 'zhouyan') b.box([0.12, 0.2, 0.016], [0.27, 1.04, 0.07], M.paper, [0, 0, 0.12]);
  }
  return b.mesh('personal_belongings');
}
