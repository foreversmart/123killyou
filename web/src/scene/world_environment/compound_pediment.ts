import { Builder } from '@/scene/geometry/builder';
import { plane, type Shape } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import {
  cloudScroll,
  lotusBoss,
  paintedBeam,
  reliefPanel,
} from '@/scene/world_environment/temple_ornament';
import {
  templeRed,
  templeJade,
  templeGold,
  templeInk,
  templeCream,
  templeRelief,
} from '@/scene/world_environment/temple_palette';

/** A carved multifoil gable, with nested gold/cream rims and a recessed jade relief. */
export function compoundPediment(
  b: Builder,
  p: V3,
  width: number,
  height: number,
  distant = false,
) {
  const face: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const curve = (t: number, inset = 0, z = 0): V3 => {
    const arch = Math.sin(t * Math.PI);
    const scallop = Math.sin(t * Math.PI * 7) * 0.08 * arch;
    return [
      p[0] + Math.cos(t * Math.PI) * (width / 2 - inset),
      p[1] + arch * (height - inset) + scallop,
      p[2] + z,
    ];
  };
  const segments = distant ? 16 : 32;
  for (let i = 0; i < segments; i++) {
    const a = curve(i / segments),
      c = curve((i + 1) / segments);
    const start = face.positions.length / 3;
    for (const q of [[p[0], p[1], p[2]], a, c]) {
      face.positions.push(...q);
      face.normals.push(0, 0, 1);
      face.uv.push((q[0] - p[0]) / width + 0.5, 1 - (q[1] - p[1]) / height);
    }
    face.indices.push(start, start + 1, start + 2);
    for (const [inset, radius, material, z] of [
      [0, 0.14, templeRed, 0],
      [0.13, 0.075, templeCream, 0.08],
      [0.25, 0.065, templeGold, 0.12],
      [0.38, 0.045, templeRed, 0.14],
    ] as const)
      b.rod(curve(i / segments, inset, z), curve((i + 1) / segments, inset, z), radius, material);
    const rearA: V3 = [a[0], a[1] - 0.08, a[2] - 0.8];
    const rearC: V3 = [c[0], c[1] - 0.08, c[2] - 0.8];
    b.rod(rearA, rearC, 0.11, templeJade);
    if (i % 4 === 0) b.rod(a, rearA, 0.065, templeGold);
  }
  b.add(face, templeInk);
  paintedBeam(b, [p[0], p[1] - 0.08, p[2] + 0.1], width + 0.35, 0.26);
  if (distant) {
    b.add(plane(width * 0.48, height * 0.47), templeRelief, [p[0], p[1] + 0.08, p[2] + 0.14]);
    return;
  }
  reliefPanel(b, [p[0], p[1] + 0.08, p[2] + 0.14], width * 0.48, height * 0.47);
  for (const side of [-1, 1]) {
    cloudScroll(b, [p[0] + side * width * 0.34, p[1] + 0.05, p[2] + 0.19], 0.55);
    lotusBoss(b, [p[0] + side * width * 0.24, p[1] + height * 0.65, p[2] + 0.22], 0.13);
  }
  lotusBoss(b, [p[0], p[1] + height * 0.79, p[2] + 0.19], 0.18);
}
