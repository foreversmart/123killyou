import { Builder } from '@/scene/geometry/builder';
import { garment } from '@/scene/geometry/garment';
import type { Identity } from '@/scene/world_character/identity';
import type { Material } from '@/scene/world/types';

export function characterDetails(id: Identity, monk: boolean, cloth: Material, shirt: Material) {
  const b = new Builder();
  if (monk) {
    b.rod([-0.065, 1.39, 0.06], [0.12, 1.12, 0.13], 0.012, shirt, 0.009);
    b.rod([0.065, 1.39, 0.06], [-0.1, 1.14, 0.14], 0.011, shirt, 0.007);
    b.add(
      garment(
        [
          [0.94, 0.184, 0.143],
          [0.99, 0.18, 0.139],
        ],
        0.002,
      ),
      {
        ...cloth,
        color: id === 'huipu' ? 0x574536 : 0x443a32,
      },
    );
    for (let i = 0; i < 17; i++) {
      const angle = (i / 16) * Math.PI;
      b.ball(
        [0.008, 0.009, 0.008],
        [Math.cos(angle) * 0.12, 1.28 - Math.sin(angle) * 0.12, 0.134],
        {
          color: 0x433124,
          rough: 0.46,
          pattern: 1,
        },
      );
    }
  }
  return b.mesh('tailored_details');
}
