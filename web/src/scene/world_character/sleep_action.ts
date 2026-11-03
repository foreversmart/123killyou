import type { CharacterRig } from '@/scene/world_character/model';
import { armPose } from '@/scene/world_character/day_actions';
import { bend, ease } from '@/scene/world_character/joints';

/**
 * Fold the first-person avatar onto the guest-room mattress.
 *
 * The supplied Zhao Xi scan has a complete native skeleton but no authored
 * clips. Rotating the rig around its root keeps the body on the same bed
 * plane while the shared arm and leg controls settle the hands and feet.
 * The first 1.6 seconds are the visible get-into-bed beat; the remaining
 * sleep wait holds the pose and lets the camera/sound carry the quiet.
 */
export function sleepAction(rig: CharacterRig, time: number) {
  const settle = ease(time, 1.6);
  const { root, body, head, arms, elbows, legs, knees } = rig;
  root.position[1] = 0.73 - 0.1 * settle;
  root.position[2] = -0.25 - 0.55 * settle;
  root.rotation[0] = -Math.PI * 0.5 * settle;

  // Keep the procedural pose controls active so the native skin receives a
  // stable, finite palette before the whole rig rotates onto the mattress.
  body.rotation = [0.035 * (1 - settle), 0, 0];
  body.scale[1] = 1 + Math.sin(time * 1.25) * 0.003;
  head.rotation = [0.04 * (1 - settle), 0.04 * (1 - settle), 0];
  armPose(rig, 0, -0.2, -0.28, 0.16);
  armPose(rig, 1, -0.2, -0.28, -0.16);
  bend(arms[0], elbows[0], 0.36);
  bend(arms[1], elbows[1], 0.36);
  legs.forEach((leg, index) => {
    leg.position[1] = 0.82;
    leg.position[2] = 0;
    leg.rotation[0] = -Math.PI * 0.5;
    bend(leg, knees[index], 0);
  });
}
