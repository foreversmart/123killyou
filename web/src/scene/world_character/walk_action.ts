import type { CharacterRig } from '@/scene/world_character/model';
import type { Performance } from '@/scene/world_character/performance';
import { bend } from '@/scene/world_character/joints';
import { HEAD_MOTION_RATE } from '@/scene/world_character/motion_rates';

function armPose(rig: CharacterRig, side: number, shoulder: number, elbow: number, spread = 0) {
  rig.arms[side].rotation[0] = shoulder;
  rig.arms[side].rotation[2] = spread;
  bend(rig.arms[side], rig.elbows[side], elbow);
}

export function walkAction(rig: CharacterRig, action: Performance, t: number, seed: number) {
  if (
    action !== 'walk' &&
    action !== 'walk_lead' &&
    action !== 'walk_camera' &&
    action !== 'walk_architecture' &&
    action !== 'walk_companion'
  )
    return false;
  const { head, body } = rig;
  // Keep every character's incidental head checks slow enough to read as
  // occasional attention shifts instead of a constant shake in travel shots.
  const luchen = rig.root.name === 'luchen';
  const headRate = HEAD_MOTION_RATE;
  const look = Math.sin(t * 0.82 * headRate + seed) * 0.16;
  head.rotation[1] = look;
  head.rotation[0] = Math.sin(t * 0.54 * headRate + seed * 0.7) * 0.025;
  body.rotation[0] = Math.sin(t * 0.9 + seed) * 0.018;
  if (!luchen) {
    const gait = rig.root.gait;
    for (const side of [0, 1]) {
      const swing = Math.sin((gait?.phase || 0) + side * Math.PI) * (gait?.weight || 0);
      armPose(
        rig,
        side,
        -0.08 + swing * 0.3,
        -0.12 - Math.max(0, swing) * 0.08,
        (side ? -1 : 1) * 0.035,
      );
    }
  }
  if (action === 'walk_lead') {
    // Lu Chen keeps the key hand close and gives a restrained half-turn to
    // check that the group is still behind him.
    head.rotation[1] = Math.sin(t * 0.46 * headRate + seed) * 0.3;
    if (!luchen) armPose(rig, 0, -0.22, -0.42, 0.08);
  }
  if (action === 'walk_camera') {
    const check = 0.5 + Math.sin(t * 0.52 * headRate + seed) * 0.5;
    head.rotation[1] = -0.24 * check;
    if (!luchen) armPose(rig, 0, -0.18 - check * 0.08, -0.3, 0.08);
  }
  if (action === 'walk_architecture') {
    head.rotation[0] = -0.16 + Math.sin(t * 0.4 * headRate + seed) * 0.06;
    head.rotation[1] = 0.26 + Math.sin(t * 0.61 * headRate + seed) * 0.14;
    if (!luchen) armPose(rig, 0, -0.18, -0.42, 0.15);
  }
  if (action === 'walk_companion') {
    head.rotation[1] = Math.sin(t * 0.66 * headRate + seed) * 0.34;
    head.rotation[0] = Math.sin(t * 0.52 * headRate + seed) * 0.035;
    if (!luchen) armPose(rig, 0, -0.1, -0.16, 0.07);
  }
  return true;
}
