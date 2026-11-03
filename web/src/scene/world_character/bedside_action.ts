import { mat4, vec3 } from 'wgpu-matrix';
import type { CharacterRig } from '@/scene/world_character/model';
import type { V3 } from '@/scene/world/types';
import { reachHand } from '@/scene/world_character/day_actions';
import { ease } from '@/scene/world_character/joints';

/** Reach from a standing position over the near side of the mattress. */
export function bedsideAction(rig: CharacterRig, time: number, startled: boolean) {
  const { body, head } = rig;
  const turn = startled ? ease(time - 0.18, 0.7) : 0;
  const pull = startled ? 0 : Math.sin(time * 2.1) * 0.035;
  body.rotation = [0.95, 0, 0];
  body.scale[1] = 1;
  head.rotation = [0.12 - turn * 0.12, -1.15 * turn, 0];

  // The native skin rotates about its actual pelvis. The fallback uses the
  // semantic body node; solve both in their own shoulder coordinate system.
  const skeleton = rig.root.skinTargets?.skeleton;
  const pelvis = skeleton?.bones.find((bone) => bone.name === 'pelvis')?.position;
  const pose = pelvis
    ? mat4.translate(
        mat4.multiply(mat4.translation(pelvis), mat4.rotationX(body.rotation[0])),
        pelvis.map((value) => -value),
      )
    : mat4.multiply(mat4.translation(body.position), mat4.rotationX(body.rotation[0]));
  const inverse = mat4.inverse(pose);
  for (const side of [0, 1]) {
    const wrist: V3 = [
      side ? 0.13 : -0.13,
      0.74 + (side ? 0 : pull * 0.6),
      0.7 - (side ? 0 : pull),
    ];
    const target = vec3.transformMat4(wrist, inverse);
    const shoulder =
      skeleton?.bones.find((bone) => bone.name === 'upper_arm.' + (side ? 'L' : 'R'))?.position ||
      rig.arms[side].position;
    const delta = vec3.subtract(target, shoulder);
    reachHand(rig, side, delta[1], Math.hypot(delta[0], delta[2]));
    rig.arms[side].rotation[1] = Math.atan2(delta[0], delta[2]);
    rig.arms[side].rotation[2] = 0;
    rig.hands[side].rotation = [-0.15, 0, (side ? -1 : 1) * 0.12];
  }
}
