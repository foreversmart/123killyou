import { Builder } from '@/scene/geometry/builder';
import { cylinder, torus } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import {
  gateIron,
  gateStone,
  gateStoneShadow,
  gateWood,
  gateWoodInset,
  gateWoodRail,
} from '@/scene/world_environment/temple_palette';

function gateHandle(b: Builder, x: number, y: number, distant: boolean) {
  const size = distant ? 0.82 : 1;
  b.add(
    cylinder(0.085 * size, 0.085 * size, 0.035 * size, distant ? 10 : 18),
    gateIron,
    [x, y, 0.19],
    [1, 1, 1],
    [Math.PI / 2, 0, 0],
  );
  b.ball([0.11 * size, 0.11 * size, 0.08 * size], [x, y, 0.225], gateIron);
  if (!distant)
    b.add(torus(0.082, 0.012, 18), gateIron, [x, y - 0.02, 0.24], [1, 1, 1], [Math.PI / 2, 0, 0]);
}

function stoneDoorFoot(b: Builder, x: number) {
  b.box([0.7, 0.13, 0.78], [x, 0.07, 0.03], gateStoneShadow);
  b.box([0.56, 0.34, 0.62], [x, 0.3, 0.03], gateStone);
  b.box([0.62, 0.08, 0.68], [x, 0.51, 0.03], gateStoneShadow);
  b.box([0.48, 0.12, 0.55], [x, 0.61, 0.03], gateStone);
}

/**
 * Closed outer gate leaves matching the reference: broad dark-red boards,
 * nearly invisible centre seam, black iron pulls and pale carved stone feet.
 * The function is deliberately separate from ceremonialDoor so interior
 * shrines can keep their denser polychrome relief language.
 */
export function outerGateDoor(
  b: Builder,
  p: V3,
  totalWidth: number,
  height: number,
  distant = false,
) {
  const local = new Builder();
  const gap = distant ? 0.035 : 0.026;
  const leafWidth = (totalWidth - gap) / 2;
  for (const side of [-1, 1]) {
    const center = side * (leafWidth / 2 + gap / 2);
    local.box([leafWidth, height, 0.23], [center, height / 2, 0], gateWood);
    local.box([leafWidth - 0.2, height - 0.18, 0.038], [center, height / 2, 0.13], gateWoodInset);
    for (const edge of [-1, 1])
      local.box(
        [0.055, height - 0.12, 0.055],
        [center + edge * (leafWidth / 2 - 0.065), height / 2, 0.17],
        gateWoodRail,
      );
    const seams = distant ? 2 : 3;
    for (let i = 1; i < seams; i++)
      local.box(
        [0.026, height - 0.24, 0.035],
        [center - leafWidth / 2 + (i * leafWidth) / seams, height / 2, 0.17],
        gateWoodRail,
      );
    for (const y of [0.12, height - 0.12])
      local.box([leafWidth - 0.1, 0.075, 0.06], [center, y, 0.18], gateWoodRail);
    gateHandle(local, center - side * leafWidth * 0.29, height * 0.5, distant);
    stoneDoorFoot(local, side * (totalWidth / 2 - 0.24));
  }
  local.box([0.038, height - 0.04, 0.26], [0, height / 2, 0.045], gateWoodRail);
  b.merge(local.build(), p);
}
