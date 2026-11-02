import { Builder, materials as M } from '@/scene/geometry/builder';
import { cylinder, lathe, torus } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import {
  templePatina,
  templeTimber,
  templeVermilion,
} from '@/scene/world_environment/temple_facade';

const gilding = { ...M.brass, color: 0xbd914f, rough: 0.57, metal: 0.6 };
export const guardianLampPositions: V3[] = [
  [-4.35, 1.12, -1.45],
  [-4.35, 1.12, 0.8],
  [4.35, 1.12, -1.45],
  [4.35, 1.12, 0.8],
];

/** Shallow carved relief stays attached to the beam, with no billboard decoration. */
export function paintedBeam(b: Builder, p: V3, width: number, yaw = 0) {
  const face = new Builder();
  face.box([width, 0.42, 0.16], [0, 0, 0], templeVermilion);
  face.box([width - 0.18, 0.26, 0.035], [0, 0, 0.097], templePatina);
  for (const y of [-0.18, 0.18]) face.box([width - 0.08, 0.025, 0.04], [0, y, 0.11], gilding);
  const count = Math.max(1, Math.floor(width / 1.3));
  for (let i = 0; i < count; i++) {
    const x = ((i + 0.5) * width) / count - width / 2;
    face.add(torus(0.083, 0.016, 12), gilding, [x, 0, 0.13], [1, 1, 1], [Math.PI / 2, 0, 0]);
    face.ball([0.038, 0.038, 0.025], [x, 0, 0.135], gilding);
    for (const side of [-1, 1]) {
      face.rod([x + side * 0.13, 0, 0.13], [x + side * 0.33, 0.07, 0.13], 0.014, gilding);
      face.rod([x + side * 0.33, 0.07, 0.13], [x + side * 0.48, 0, 0.13], 0.014, gilding);
    }
  }
  b.merge(face.build(), p, [0, yaw, 0]);
}

/** Physical bronze oil bowls correspond to the four guardian illumination anchors. */
export function shrineLamp(b: Builder, p: V3) {
  const lamp = new Builder();
  lamp.add(cylinder(0.14, 0.19, 0.08, 16), templeTimber, [0, 0.04, 0]);
  lamp.add(
    lathe(
      [
        [0.16, 0.08],
        [0.11, 0.12],
        [0.045, 0.23],
        [0.05, 0.65],
        [0.1, 0.75],
        [0.19, 0.79],
        [0.23, 0.87],
        [0.02, 0.86],
      ],
      20,
    ),
    gilding,
  );
  lamp.add(torus(0.22, 0.018, 20), gilding, [0, 0.87, 0]);
  lamp.ball([0.025, 0.09, 0.025], [0, 0.94, 0], {
    color: 0xffbf5d,
    rough: 0.9,
    glow: 2.2,
  });
  b.merge(lamp.build(), p);
}
