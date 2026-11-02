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
  // Each bite has a short settle at the bowl, a deliberate lift to the mouth,
  // and a slower return. Keeping the three phases explicit prevents the spoon
  // from hovering between the two anchors when the frame rate changes.
  const time = Math.max(0, t - (seed % 0.6)) % 4.8;
  const raise = ease(time - 0.55, 0.72);
  const lower = ease(time - 2.35, 1.05);
  return Math.max(0, Math.min(1, raise * (1 - lower)));
}

/**
 * The hand targets are in the arm's local sagittal plane. These values are
 * tied to the anatomical head and table height in characterModel, so the
 * spoon tip meets the lower lip at the top of a bite and returns to the bowl
 * rim at the bottom. The small lateral drift reads as a relaxed wrist rather
 * than a robotic hinge.
 */
export function mealHandTarget(lift: number, t: number): [number, number] {
  const sway = Math.sin(t * 2.1) * 0.008 * (1 - lift);
  return [0.045 + lift * 0.14 + sway, 0.43 - lift * 0.16];
}

export function mealUtensilRotation(lift: number, t: number): [number, number, number] {
  // The spoon starts with its bowl tipped toward the held bowl. As the hand
  // reaches the lower lip it flattens, then adds a small inward roll. Keeping
  // the three axes explicit avoids the old wrist spin which made the spoon
  // miss both anchors even when the hand itself was correctly solved.
  const settle = Math.max(0, Math.min(1, lift));
  const wristSway = Math.sin(t * 2.1) * 0.045 * settle;
  return [0.31 - settle * 0.23, wristSway, -0.035 - settle * 0.095];
}

/**
 * Offset the spoon from the eating hand so its bowl has two real anchors:
 * over the held bowl at rest and just below the mouth at the top of a bite.
 * This is expressed in the hand's local frame because the forearm rotates as
 * it reaches; leaving the offset at the wrist made the spoon float beside the
 * bowl whenever the character turned their elbow.
 */
export function mealUtensilOffset(lift: number, t: number): [number, number, number] {
  const sway = Math.sin(t * 2.1) * 0.008 * (1 - lift);
  // These values account for the spoon's bowl being slightly ahead of the
  // grip. At lift=0 it settles over the ceramic rim; at lift=1 it reaches the
  // lower lip, while the hand and elbow continue to carry the motion.
  const settle = Math.max(0, Math.min(1, lift));
  return [
    0.202 + 0.124 * (1 - settle) + sway,
    0.146 + 0.001 * (1 - settle),
    0.177 - 0.198 * (1 - settle),
  ];
}

function reachAcross(rig: CharacterRig, side: number, x: number, y: number, z: number) {
  const offset = x - rig.arms[side].position[0];
  reachHand(rig, side, y, Math.hypot(offset, z));
  rig.arms[side].rotation[1] = Math.atan2(offset, z);
}

export function dayAction(
  rig: CharacterRig,
  action: Performance,
  t: number,
  seed: number,
  registerDesk = false,
) {
  const { head, body } = rig;
  const arrive = ease(t, 0.8);
  if (action === 'walk') {
    // Walking is shared by the transition shots, but each person should still
    // feel occupied: a brief look toward a companion and a loose arm swing
    // keep the procession from reading as a rigid marching line.
    const look = Math.sin(t * 0.82 + seed) * 0.16;
    head.rotation[1] = look;
    head.rotation[0] = Math.sin(t * 0.54 + seed * 0.7) * 0.025;
    body.rotation[0] = Math.sin(t * 0.9 + seed) * 0.018;
    armPose(rig, 0, -0.08, -0.12, 0.035 + Math.sin(t * 1.8 + seed) * 0.02);
    armPose(rig, 1, -0.08, -0.12, -0.035 - Math.sin(t * 1.8 + seed) * 0.02);
  }
  if (action === 'write') {
    // The supporting hand stays fixed; the brush hand makes short strokes.
    const seat = body.position[1] - 0.46;
    reachHand(rig, 1, -0.07 - seat, 0.38);
    reachHand(rig, 0, 0.15 - seat + Math.sin(t * 4.1) * 0.002, 0.49 + Math.sin(t * 3.1) * 0.025);
    rig.hands[0].rotation[0] = -(rig.arms[0].rotation[0] + rig.elbows[0].rotation[0]);
    head.rotation[0] = 0.25;
    body.rotation[0] = 0;
  }
  if (action === 'eat') {
    // Repeat until the backend ends the meal, with staggered bites.
    const time = Math.max(0, t - (seed % 0.6));
    const lift = mealLift(t, seed);
    const [handY, handZ] = mealHandTarget(lift, time);
    reachHand(rig, 0, handY, handZ);
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
    // A glance is a continuing observation, not a single loop that snaps
    // back to the camera after one beat. The slow sweep pauses at either side
    // while a smaller nod and shoulder shift keep the body occupied between
    // lines of dialogue (useful around the registration desk and windows).
    const sweep = Math.sin(t * 0.7 + seed * 0.11);
    const pause = 0.72 + 0.28 * Math.cos(t * 0.35 + seed * 0.07);
    if (registerDesk) {
      // Keep the registration group oriented toward Lu Chen. Xu Zhi gets one
      // visible look toward the courtyard, then eases her attention back to
      // the desk instead of continuously sweeping the room like a searchlight.
      const cycle = t % 7.2;
      const towardWindow = ease(cycle - 0.8, 0.9) * (1 - ease(cycle - 2.8, 1.3));
      const windowLook = Math.max(0, Math.min(1, towardWindow));
      head.rotation[1] = 0.055 + 0.52 * windowLook + Math.sin(t * 0.55 + seed) * 0.018;
      body.rotation[1] = 0.035 * windowLook + Math.sin(t * 0.3 + seed) * 0.018;
    } else {
      head.rotation[1] = -0.62 * sweep * pause;
      body.rotation[1] = Math.sin(t * 0.34 + seed * 0.17) * 0.045;
    }
    head.rotation[0] = 0.035 + Math.sin(t * 0.92 + seed) * 0.018;
    armPose(rig, 0, -0.055, -0.1, 0.045 + Math.sin(t * 0.63 + seed) * 0.018);
    armPose(rig, 1, -0.06, -0.1, -0.045 - Math.sin(t * 0.63 + seed) * 0.018);
  }
  if (action === 'point_floor') {
    // During the drag-mark question Zhou Yan stays in the registration
    // tableau, facing Lu Chen with the rest of the group, while his near hand
    // clearly indicates the mark on the floor. Keep the lean and lowered gaze
    // continuous so the gesture reads as a deliberate reference rather than
    // the ledger inspection pose.
    const settle = ease(t, 0.8);
    const trace = Math.sin(t * 0.72 + seed * 0.08) * 0.025;
    body.rotation[0] = (0.38 + trace) * settle;
    head.rotation[0] = 0.46 * settle;
    head.rotation[1] = 0.08 + Math.sin(t * 0.46 + seed) * 0.018;
    armPose(rig, 0, -0.62 - 0.025 * trace, -1.36, 0.12);
    armPose(rig, 1, -0.06, -0.1, -0.045);
  }
  if (action === 'inspect') {
    // Keep the reader engaged with the ledger after the first lean-in. A
    // small weight shift, eye trace and hand adjustment follow the brush
    // instead of leaving Zhou Yan frozen in one completed pose.
    const trace = Math.sin(t * 0.82 + seed * 0.08);
    const settle = 0.78 + 0.22 * ease(t, 0.8);
    body.rotation[0] = (0.26 + 0.035 * trace) * settle;
    body.rotation[1] = registerDesk
      ? 0.028 + Math.sin(t * 0.38 + seed) * 0.018
      : Math.sin(t * 0.38 + seed) * 0.028;
    head.rotation[0] = (0.3 + 0.035 * Math.sin(t * 0.7 + seed)) * settle;
    head.rotation[1] = registerDesk
      ? 0.1 + 0.035 * Math.sin(t * 0.56 + seed * 0.13)
      : 0.09 * Math.sin(t * 0.56 + seed * 0.13);
    armPose(
      rig,
      0,
      -0.3 - 0.035 * trace,
      -0.7 - 0.06 * Math.sin(t * 0.82 + seed * 0.08 + 0.45),
      0.08 + 0.018 * Math.sin(t * 0.63 + seed),
    );
  }
  if (action === 'admire' || action === 'look_up') {
    // Finish one deliberate scan, then settle on the eave with only a small
    // breathing shift. A perpetual full-range sine made the same look repeat
    // even after the line had moved on to the next beat.
    const scan = ease(t, 4.2);
    const settle = ease(t - 4.2, 1.2);
    const scanned = 0.28 + Math.sin(scan * Math.PI * 2) * 0.24;
    const settled = 0.34 + Math.sin(Math.max(0, t - 4.2) * 0.62) * 0.035;
    head.rotation[0] = -0.3 * arrive;
    head.rotation[1] = (scanned * (1 - settle) + settled * settle) * arrive;
    body.rotation[1] = 0.12 * arrive * (1 - 0.18 * settle);
    if (action === 'look_up') {
      const arm = arrive * (1 - 0.18 * settle);
      armPose(rig, 0, -0.4 * arm, -0.9 * arm, 0.14 * arm);
    }
  }
  if (action === 'stretch') {
    const lean = Math.sin(ease(t, 2.6) * Math.PI);
    body.rotation[0] = 0.35 * lean;
    head.rotation[0] = 0.25 * lean;
    armPose(rig, 0, 0.1 * lean, -0.1, 0.08);
  }
  if (action === 'luggage') {
    // A low, relaxed two-hand hold gives the luggage handler a purposeful
    // idle pose while the other guests finish stepping off the coach.
    const shift = Math.sin(ease(t, 1.8) * Math.PI);
    armPose(rig, 0, -0.18 - shift * 0.08, -0.95, 0.25);
    armPose(rig, 1, -0.16 - shift * 0.08, -0.9, -0.25);
    body.rotation[0] = 0.08 * shift;
    head.rotation[0] = 0.1 * shift;
    head.rotation[1] = -0.1 * shift;
  }
  if (action === 'welcome') {
    const invite = Math.sin(ease(t, 3.4) * Math.PI);
    armPose(rig, 0, -0.4 * invite, -0.65 * invite, 0.3 * invite);
    head.rotation[0] = 0.1 * invite;
  }
  if (action === 'camera' || action === 'review_camera') {
    // Repeat a quiet “raise, check, lower, glance back” beat. A single ease
    // left Lin Lan holding the camera at one height for the rest of the
    // registration exchange, which read as a mannequin pose.
    const cycle = t % 6.4;
    const lift =
      cycle < 1.2
        ? ease(cycle, 1.2)
        : cycle < 2.4
          ? 1 - 0.035 * ease(cycle - 1.2, 1.2)
          : cycle < 4.3
            ? 0.965 - 0.72 * ease(cycle - 2.4, 1.9)
            : 0.245 + 0.7 * ease(cycle - 4.3, 2.1);
    const height = action === 'camera' ? 0.18 : -0.12;
    for (const side of [0, 1]) {
      reachAcross(
        rig,
        side,
        (side ? 1 : -1) * (0.215 - 0.13 * lift),
        -0.27 + (height + 0.27) * lift,
        0.22,
      );
    }
    if (rig.camera) {
      rig.camera.position = [0, 0.21 + (height + 0.27) * lift, 0.23];
      const check = ease(t - 1.6, 1.4);
      rig.camera.rotation[0] =
        (action === 'camera' ? -0.1 : 0.35) * lift +
        Math.sin(Math.max(0, t - 1.6) * 0.7) * 0.025 * check;
    }
    head.rotation[0] = (action === 'camera' ? -0.08 : 0.26) * lift;
    const lookBack = registerDesk ? 0.16 * (1 - lift) : 0.11 * (1 - lift);
    head.rotation[1] = lookBack + Math.sin(t * 0.7) * 0.035;
    body.rotation[1] = (registerDesk ? 0.035 : 0) + Math.sin(t * 0.34) * 0.022 * (1 - 0.25 * lift);
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
