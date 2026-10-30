import type { CharacterRig } from '@/scene/world_character/model';
import type { Performance } from '@/scene/world_character/performance';
import { bend, ease } from '@/scene/world_character/joints';

export function armPose(
  rig: CharacterRig,
  side: number,
  shoulder: number,
  elbow: number,
  spread = 0,
) {
  rig.arms[side].rotation[0] = shoulder;
  rig.arms[side].rotation[2] = spread;
  bend(rig.arms[side], rig.elbows[side], elbow);
}

// Solve a reach in the arm's sagittal plane. The source mesh and hand socket
// share these anatomical lengths, keeping the brush on the actual page.
export function reachHand(rig: CharacterRig, side: number, y: number, z: number) {
  const pivot = rig.elbows[side].position,
    tip = rig.hands[side].position;
  const upper = Math.hypot(pivot[1], pivot[2]),
    lower = Math.hypot(tip[1], tip[2]);
  const upperAngle = Math.atan2(pivot[2], -pivot[1]);
  const lowerAngle = Math.atan2(tip[2], -tip[1]);
  const flex = Math.acos(
    Math.max(
      -1,
      Math.min(1, (y * y + z * z - upper * upper - lower * lower) / (2 * upper * lower)),
    ),
  );
  const angle =
    Math.atan2(z, -y) - Math.atan2(lower * Math.sin(flex), upper + lower * Math.cos(flex));
  armPose(rig, side, upperAngle - angle, lowerAngle - upperAngle - flex);
}

export function mealLift(t: number, seed: number) {
  const time = Math.max(0, t - (seed % 0.6));
  return ease(time - 0.6, 0.9) * (1 - ease(time - 2.7, 1.1));
}

export function dayAction(rig: CharacterRig, action: Performance, t: number, seed: number) {
  const { head, body } = rig;
  const arrive = ease(t, 0.8);
  if (action === 'write') {
    // The supporting hand stays fixed; the brush hand makes short strokes.
    const seat = body.position[1] - 0.46;
    reachHand(rig, 1, -0.07 - seat, 0.38);
    reachHand(rig, 0, 0.15 - seat + Math.sin(t * 4.1) * 0.002, 0.49 + Math.sin(t * 3.1) * 0.006);
    rig.hands[0].rotation[0] = -(rig.arms[0].rotation[0] + rig.elbows[0].rotation[0]);
    head.rotation[0] = 0.25;
    body.rotation[0] = 0;
  }
  if (action === 'eat') {
    // One complete meal beat, with staggered starts so companions do not move in unison.
    const time = Math.max(0, t - (seed % 0.6));
    const lift = mealLift(t, seed);
    reachHand(rig, 0, 0.02 + lift * 0.14, 0.43 - lift * 0.16);
    reachHand(rig, 1, -0.04, 0.43);
    rig.arms[0].rotation[2] = 0.3;
    rig.arms[1].rotation[2] = -0.24;
    head.rotation[0] = 0.12 + (1 - lift) * 0.1;
    head.rotation[2] = Math.sin(time * 2.2) * 0.008 * lift;
    body.rotation[0] = 0.04;
  }
  if (action === 'offer' || action === 'rescue') {
    armPose(rig, 0, -0.12, -0.3);
    armPose(rig, 1, -0.25 - arrive * 0.22, -0.85, -0.09);
    head.rotation[0] = action === 'rescue' ? 0.15 * (1 - arrive) : 0.025;
  }
  if (action === 'hush') {
    armPose(rig, 1, -0.47, -0.85, -0.09);
    armPose(rig, 0, -0.32, -1.9 * arrive, 0.12);
    head.rotation[0] = 0.045;
  }
  if (action === 'glance') {
    head.rotation[1] = -0.75 * Math.sin(ease(t, 3.2) * Math.PI);
    head.rotation[0] = 0.035;
  }
  if (action === 'inspect') {
    body.rotation[0] = 0.3 * arrive;
    head.rotation[0] = 0.35 * arrive;
    armPose(rig, 0, -0.3, -0.7, 0.08);
  }
  if (action === 'look_up') head.rotation[0] = -0.25 * arrive;
  if (action === 'camera') {
    armPose(rig, 0, -0.3, -1.08, 0.2);
    armPose(rig, 1, -0.3, -1.08, -0.2);
    head.rotation[0] = 0.26 * arrive;
  }
  if (action === 'ribbon') {
    armPose(rig, 1, -0.3, -2.1 * arrive, -0.32);
    head.rotation[2] = 0.1 * arrive;
  }
  if (action === 'ritual') {
    const release = ease(t, 0.65) * (1 - ease(t - 1, 0.65));
    armPose(rig, 0, -0.45 - release * 0.2, -0.72, 0.1);
    armPose(rig, 1, -0.45 - release * 0.2, -0.72, -0.1);
    head.rotation[0] = 0.3;
  }
}
