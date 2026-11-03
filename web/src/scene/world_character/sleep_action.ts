import type { CharacterRig } from '@/scene/world_character/model';
import { armPose } from '@/scene/world_character/day_actions';
import { bend, ease } from '@/scene/world_character/joints';
import { ROOM_SLEEP_SETTLE_SECONDS } from '@/shared/lib/story_timing';

/** Sit on the near edge, take weight on the mattress, then lift the legs and recline. */
export function sleepAction(rig: CharacterRig, time: number, startFacing = 0) {
  const turn = ease(time, 0.3);
  const sit = ease(time - 0.25, 0.6);
  // Hold the seated pose before the lower legs swing onto the mattress.
  const recline = ease(time - 1.05, ROOM_SLEEP_SETTLE_SECONDS - 1.05);
  const lift = ease(time - 1.05, 0.42);
  const { root, body, head, legs, knees } = rig;
  const facing = Math.atan2(Math.sin(startFacing), Math.cos(startFacing));
  const seatedFacing = Math.PI / 2;
  root.position = [-2.05 - 0.28 * sit - 0.67 * recline, 0, -1.55];
  root.rotation = [0, (facing + (seatedFacing - facing) * turn) * (1 - recline), 0];
  const hipHeight = 0.65 - 0.04 * sit + 0.1 * recline;
  root.pelvisSupportHeight = hipHeight;

  // The upper body hinges at the pelvis. Raising/rotating the complete rig
  // around its feet makes the avatar jump onto the bed before falling back.
  body.position[1] = root.skinTargets ? 0.82 : hipHeight;
  body.rotation = [0.16 * Math.sin(sit * Math.PI) - (Math.PI / 2) * recline, 0, 0];
  body.scale[1] = 1 + Math.sin(time * 1.25) * 0.003 * recline;
  head.rotation = [0.08 * sit * (1 - recline), 0, 0];
  const support = sit * (1 - recline);
  armPose(rig, 0, -0.06 + 0.36 * support, -0.09 - 0.16 * support, 0.12 * sit);
  armPose(rig, 1, -0.06 + 0.36 * support, -0.09 - 0.16 * support, -0.12 * sit);
  legs.forEach((leg, index) => {
    leg.position[1] = body.position[1];
    leg.position[2] = 0;
    leg.rotation[0] = -1.4 * sit - (Math.PI / 2 - 1.4) * lift;
    bend(leg, knees[index], 1.4 * sit * (1 - lift));
  });
}
