import { Builder } from '@/scene/geometry/builder';
import { plane } from '@/scene/geometry/primitives';
import type { V3 } from '@/scene/world/types';
import {
  templeGold,
  templeInk,
  templeJade,
  templePaint,
  templeRed,
  templeRelief,
} from '@/scene/world_environment/temple_palette';
import { cloudScroll, lotusBoss } from '@/scene/world_environment/temple_carving';
export { cloudScroll, lotusBoss } from '@/scene/world_environment/temple_carving';
export { shrineCrown } from '@/scene/world_environment/temple_shrine_crown';

/** Wide walls hold adjacent upright tableaux instead of stretching their figures. */
export function reliefSurface(b: Builder, p: V3, width: number, height: number) {
  const count = Math.max(1, Math.round(width / (height * 0.8)));
  const span = width / count;
  for (let i = 0; i < count; i++) {
    const x = p[0] - width / 2 + (i + 0.5) * span;
    const panel = plane(span - (count > 1 ? 0.025 : 0), height);
    // Tall, narrow leaves crop the picture horizontally so faces retain their
    // proportions. The complete tableau is used when the bay is broad enough.
    const fraction = Math.min(1, span / (height * 0.8));
    for (let uv = 0; uv < panel.uv.length; uv += 2)
      panel.uv[uv] = 0.5 + (panel.uv[uv] - 0.5) * fraction;
    b.add(panel, templeRelief, [x, p[1], p[2]]);
    if (i > 0)
      b.box([0.025, height, 0.035], [x - span / 2, p[1] + height / 2, p[2] + 0.015], templeGold);
  }
}

/** Centred beam: recessed painted panels, gilded rails and tangible carved bosses. */
export function paintedBeam(b: Builder, p: V3, width: number, height = 0.3, yaw = 0) {
  const local = new Builder();
  local.box([width, height, 0.2], [0, 0, 0], templeRed);
  const count = Math.max(1, Math.round(width / (height * 3.2)));
  const panelWidth = (width - 0.08) / count;
  for (let i = 0; i < count; i++) {
    const x = (i + 0.5) * panelWidth - (width - 0.08) / 2;
    local.add(plane(panelWidth - 0.025, height * 0.73), templePaint, [x, -height * 0.365, 0.108]);
    if (i > 0) local.box([0.032, height * 0.8, 0.03], [x - panelWidth / 2, 0, 0.13], templeGold);
  }
  for (const side of [-1, 1]) {
    local.box([width, 0.022, 0.035], [0, side * height * 0.46, 0.12], templeGold);
    local.box([width, 0.024, 0.04], [0, side * height * 0.35, 0.123], templeJade);
  }
  b.merge(local.build(), p, [0, yaw, 0]);
}

/** Bottom-centred wall niche: real reveal/frame, inset polychrome relief and projecting clouds. */
export function reliefPanel(b: Builder, p: V3, width: number, height: number, yaw = 0) {
  const local = new Builder();
  local.box([width, height, 0.17], [0, height / 2, 0], templeInk);
  reliefSurface(local, [0, 0.09, 0.092], width - 0.14, height - 0.18);
  for (const side of [-1, 1]) {
    local.box([0.07, height, 0.24], [side * (width / 2 - 0.035), height / 2, 0.055], templeRed);
    local.box(
      [0.018, height - 0.08, 0.03],
      [side * (width / 2 - 0.083), height / 2, 0.14],
      templeGold,
    );
  }
  for (const y of [0.04, height - 0.04]) local.box([width, 0.08, 0.25], [0, y, 0.06], templeJade);
  // The silhouette and depth survive oblique camera angles; high-frequency
  // mineral paint and figures live in the local texture rather than in UI art.
  for (const side of [-1, 1]) {
    cloudScroll(local, [side * width * 0.31, height * 0.78, 0.15], width * 0.3);
    cloudScroll(local, [side * width * 0.3, height * 0.22, 0.15], width * 0.24);
  }
  lotusBoss(local, [0, height + 0.025, 0.12], Math.min(0.15, width * 0.12));
  b.merge(local.build(), p, [0, yaw, 0]);
}
