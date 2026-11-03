import { mat4, quat, vec3 } from 'wgpu-matrix';
import type { CharacterRig } from '@/scene/world_character/model';
import type { SkinSkeleton, V3, WorldNode } from '@/scene/world/types';
import { bend, ease } from '@/scene/world_character/joints';
import { HEAD_MOTION_RATE } from '@/scene/world_character/motion_rates';

const rotation = (angles: V3) =>
  mat4.rotateZ(mat4.rotateX(mat4.rotationY(angles[1]), angles[0]), angles[2]);
const transform = (node: WorldNode) =>
  mat4.scale(mat4.multiply(mat4.translation(node.position), rotation(node.rotation)), node.scale);
const bone = (skeleton: SkinSkeleton, name: string) =>
  skeleton.bones.find((entry) => entry.name === name)!.position;

function bodyPose(rig: CharacterRig, skeleton: SkinSkeleton) {
  const pelvis = bone(skeleton, 'pelvis');
  let matrix = mat4.multiply(
    mat4.translation(pelvis),
    mat4.scale(rotation(rig.body.rotation), rig.body.scale),
  );
  matrix = mat4.translate(
    matrix,
    pelvis.map((value) => -value),
  );
  return mat4.multiply(mat4.translation([0, rig.body.position[1] - 0.82, 0]), matrix);
}

/** Solve the real upper/lower lengths in the same corrected axes as skin_pose. */
function reach(rig: CharacterRig, side: number, target: Float32Array, skeleton: SkinSkeleton) {
  const suffix = side ? 'L' : 'R';
  const delta = vec3.subtract(target, bone(skeleton, 'upper_arm.' + suffix));
  const upper = rig.elbows[side].position,
    lower = rig.hands[side].position;
  const a = vec3.length(upper),
    b = vec3.length(lower);
  const distance = Math.min(a + b - 0.0001, vec3.length(delta));
  const flex = Math.acos(
    Math.max(-1, Math.min(1, (distance * distance - a * a - b * b) / (2 * a * b))),
  );
  const upperRest = Math.atan2(upper[2], -upper[1]);
  const lowerRest = Math.atan2(lower[2], -lower[1]);
  const radial = Math.hypot(delta[0], delta[2]);
  const pitch =
    Math.atan2(radial, -delta[1]) - Math.atan2(b * Math.sin(flex), a + b * Math.cos(flex));
  rig.arms[side].rotation = [upperRest - pitch, Math.atan2(delta[0], delta[2]), 0];
  bend(rig.arms[side], rig.elbows[side], lowerRest - upperRest - flex);
}

function aimFingers(
  rig: CharacterRig,
  side: number,
  target: Float32Array,
  wrist: Float32Array,
  skeleton: SkinSkeleton,
) {
  const suffix = side ? 'L' : 'R';
  const hand = bone(skeleton, 'hand.' + suffix);
  const forearm = bone(skeleton, 'forearm.' + suffix);
  const align = mat4.fromQuat(
    quat.rotationTo(
      vec3.normalize(vec3.subtract(hand, forearm)),
      vec3.normalize([0, -0.28, -0.005]),
    ),
  );
  // Scanned characters use semantic index bones instead of the generic
  // finger_1 tip name used by the shared camera rig. Prefer the supplied
  // index chain, then fall back to the common retargeting name.
  const fingerName = skeleton.bones.some((entry) => entry.name === 'index_02.' + suffix)
    ? 'index_02.' + suffix
    : 'finger_1.' + suffix + '_tip';
  const finger = vec3.transformMat4Upper3x3(vec3.subtract(bone(skeleton, fingerName), hand), align);
  const parent = mat4.multiply(
    rotation(rig.arms[side].rotation),
    rotation(rig.elbows[side].rotation),
  );
  const direction = vec3.transformMat4Upper3x3(vec3.subtract(target, wrist), mat4.inverse(parent));
  const matrix = mat4.fromQuat(quat.rotationTo(vec3.normalize(finger), vec3.normalize(direction)));
  rig.hands[side].rotation = [
    Math.asin(Math.max(-1, Math.min(1, -matrix[9]))),
    Math.atan2(matrix[8], matrix[10]),
    Math.atan2(matrix[1], matrix[5]),
  ];
}

export function skinMealUtensilRotation(lift: number): V3 {
  return [0.2 - 2.2 * lift, 0, 0];
}

function meal(rig: CharacterRig, lift: number, time: number, skeleton: SkinSkeleton) {
  rig.head.rotation = [
    0.12 + (1 - lift) * 0.1,
    0,
    Math.sin(time * 2.2 * HEAD_MOTION_RATE) * 0.008 * lift,
  ];
  rig.body.rotation[0] = 0.04;
  const pose = bodyPose(rig, skeleton),
    inverse = mat4.inverse(pose);
  const head = bone(skeleton, 'head');
  const bowl = vec3.transformMat4([head[0] + 0.095, head[1] - 0.295, head[2] + 0.31], pose);
  reach(rig, 1, vec3.transformMat4(bowl, inverse), skeleton);
  // The scan's lower lip is head + [-.004, .031, .121]. Keep the spoon
  // centre a centimetre below it and just in front of the actual face.
  const mouth = vec3.add(
    head,
    vec3.transformMat4Upper3x3([-0.004, 0.021, 0.14], rotation(rig.head.rotation)),
  );
  const target = vec3.lerp(vec3.add(bowl, [0, 0.09, 0]), vec3.transformMat4(mouth, pose), lift);
  const tip = vec3.transformMat4Upper3x3([0, 0.13, 0.16], rotation(skinMealUtensilRotation(lift)));
  reach(rig, 0, vec3.transformMat4(vec3.subtract(target, tip), inverse), skeleton);
}

function camera(
  rig: CharacterRig,
  action: string,
  time: number,
  registerDesk: boolean,
  skeleton: SkinSkeleton,
) {
  const cycle = time % 6.4;
  const lift =
    cycle < 1.2
      ? ease(cycle, 1.2)
      : cycle < 2.4
        ? 1 - 0.035 * ease(cycle - 1.2, 1.2)
        : cycle < 4.3
          ? 0.965 - 0.72 * ease(cycle - 2.4, 1.9)
          : 0.245 * (1 - ease(cycle - 4.3, 2.1));
  const center = skeleton.camera!.center;
  const control = rig.camera!;
  control.position = [
    center[0],
    center[1] - 0.82 + (action === 'camera' ? 0.45 : 0.15) * lift,
    center[2] + 0.075 * lift,
  ];
  control.rotation[0] = (action === 'camera' ? -0.1 : 0.35) * lift;
  rig.head.rotation[0] = (action === 'camera' ? -0.08 : 0.26) * lift;
  rig.head.rotation[1] =
    (registerDesk ? 0.16 : 0.11) * (1 - lift) + Math.sin(time * 0.7 * HEAD_MOTION_RATE) * 0.035;
  rig.body.rotation[1] = (registerDesk ? 0.035 : 0) + Math.sin(time * 0.34) * 0.022;
  const inverse = mat4.inverse(bodyPose(rig, skeleton));
  const cameraMatrix = mat4.multiply(transform(rig.body), transform(control));
  for (const side of [0, 1]) {
    const sign = side ? 1 : -1;
    // The current camera mask is 12.6 cm wide. Wrists sit outside its sides;
    // index fingers close inward onto the body instead of passing above it.
    const wrist = vec3.transformMat4(
      vec3.transformMat4([sign * 0.1, -0.018, -0.025], cameraMatrix),
      inverse,
    );
    const finger = vec3.transformMat4(
      vec3.transformMat4([sign * 0.035, -0.012, 0.003], cameraMatrix),
      inverse,
    );
    reach(rig, side, wrist, skeleton);
    aimFingers(rig, side, finger, wrist, skeleton);
  }
}

export function skinnedDayAction(
  rig: CharacterRig,
  action: string,
  time: number,
  lift: number,
  registerDesk: boolean,
) {
  const skeleton = rig.root.skinTargets?.skeleton;
  if (!skeleton) return false;
  if (action === 'eat') meal(rig, lift, time, skeleton);
  else if (skeleton.camera && rig.camera && ['camera', 'review_camera'].includes(action))
    camera(rig, action, time, registerDesk, skeleton);
  else return false;
  return true;
}
