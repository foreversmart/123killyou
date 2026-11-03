import { mat4, quat, vec3 } from 'wgpu-matrix';
import type { CharacterTargets, Geometry, SkinSkeleton, V3, WorldNode } from '@/scene/world/types';
import { skinGroundContact } from '@/scene/world_character/skin_contacts';

type Targets = CharacterTargets & { mesh: WorldNode; skeleton?: SkinSkeleton };
const rotation = (r: V3) => mat4.rotateZ(mat4.rotateX(mat4.rotationY(r[1]), r[0]), r[2]);
function transform(node: WorldNode) {
  return mat4.scale(
    mat4.multiply(mat4.translation(node.position), rotation(node.rotation)),
    node.scale,
  );
}
function pivot(position: V3, rotate: Float32Array) {
  return mat4.translate(
    mat4.multiply(mat4.translation(position), rotate),
    position.map((v) => -v),
  );
}

/** Retarget anatomical controls in world bind axes, including the export's bent arm rest pose. */
export function createSkinPose(targets: Targets, skeleton: SkinSkeleton, geometry?: Geometry) {
  const { bones } = skeleton;
  const groundContact = skinGroundContact(geometry);
  const names = new Map(bones.map((bone, index) => [bone.name, index]));
  const get = (name: string) => {
    const index = names.get(name);
    if (index === undefined) throw new Error('角色缺少动作骨骼：' + name);
    return index;
  };
  const corrections = new Map<number, Float32Array>();
  const correction = (name: string, child: string, direction: V3) => {
    const index = get(name);
    const source = vec3.normalize(vec3.subtract(bones[get(child)].position, bones[index].position));
    const target = vec3.normalize(direction);
    // A few scans export a reversed thigh axis while keeping valid bind
    // positions. Keep that native axis instead of flipping the entire leg;
    // the procedural rotation still acts around the anatomical pivot.
    corrections.set(
      index,
      name.startsWith('thigh.') && vec3.dot(source, target) < 0
        ? mat4.identity()
        : mat4.fromQuat(quat.rotationTo(source, target)),
    );
  };
  for (const side of ['R', 'L']) {
    correction('upper_arm.' + side, 'forearm.' + side, [0, -0.26, 0.035]);
    correction('forearm.' + side, 'hand.' + side, [0, -0.28, -0.005]);
    correction('thigh.' + side, 'shin.' + side, [0, -0.38, 0.02]);
    correction('shin.' + side, 'foot.' + side, [0, -0.38, 0.05]);
  }
  const matrices = new Float32Array(bones.length * 16);
  targets.skeleton = skeleton;
  const head = bones[get('head')].position;
  targets.head.position = [head[0], head[1] - 0.82, head[2]];
  if (skeleton.camera && targets.camera) {
    const center = skeleton.camera.center;
    targets.camera.position = [center[0], center[1] - 0.82, center[2]];
  }
  targets.mesh.skinMatrices = matrices;
  const deform = bones.map(() => mat4.identity());
  const baseline = bones.map((bone) => mat4.multiply(bone.bind, bone.inverseBind));
  // Reuse the real bone lengths for reach solvers (camera and meal gestures).
  for (const [side, suffix] of [
    [0, 'R'],
    [1, 'L'],
  ] as const) {
    const upper = bones[get('upper_arm.' + suffix)].position;
    const lower = bones[get('forearm.' + suffix)].position;
    const hand = bones[get('hand.' + suffix)].position;
    targets.arms[side].position = [upper[0], upper[1] - 0.82, upper[2]];
    targets.elbows[side].position = Array.from(
      vec3.mulScalar(vec3.normalize([0, -0.26, 0.035]), vec3.distance(upper, lower)),
    ) as V3;
    targets.hands[side].position = Array.from(
      vec3.mulScalar(vec3.normalize([0, -0.28, -0.005]), vec3.distance(lower, hand)),
    ) as V3;
  }
  const local = new Map<number, Float32Array>();
  const socket = (
    node: WorldNode,
    parent: Float32Array,
    bone: string,
    align?: Float32Array,
    sole = false,
  ) => {
    const index = get(bone);
    const position = [...bones[index].position] as V3;
    if (sole) {
      position[1] = 0;
      position[2] += 0.03;
    }
    let world = mat4.translate(deform[index], position);
    if (align) world = mat4.multiply(world, mat4.inverse(align));
    node.matrix = mat4.multiply(mat4.inverse(parent), world);
    for (const prop of node.children) {
      if (!prop.upright) continue;
      const position = vec3.transformMat4(prop.position, world);
      prop.matrix = mat4.multiply(
        mat4.inverse(world),
        mat4.scale(mat4.translation(position), prop.scale),
      );
    }
  };
  return () => {
    local.clear();
    const dy = targets.body.position[1] - 0.82;
    const pelvis = get('pelvis');
    // Keep legs independent of a bowing torso, matching seated and kneeling controls.
    local.set(
      pelvis,
      pivot(
        bones[pelvis].position,
        mat4.scale(rotation(targets.body.rotation), targets.body.scale),
      ),
    );
    local.set(get('head'), pivot(bones[get('head')].position, rotation(targets.head.rotation)));
    for (const [side, suffix] of [
      [0, 'R'],
      [1, 'L'],
    ] as const) {
      const upper = get('upper_arm.' + suffix),
        lower = get('forearm.' + suffix);
      const thigh = get('thigh.' + suffix),
        shin = get('shin.' + suffix);
      for (const [index, control, previous] of [
        [upper, targets.arms[side], undefined],
        [lower, targets.elbows[side], upper],
        [get('hand.' + suffix), targets.hands[side], lower],
        [thigh, targets.legs[side], undefined],
        [shin, targets.knees[side], thigh],
      ] as const) {
        const align =
          corrections.get(index) ||
          (previous === undefined ? mat4.identity() : corrections.get(previous)!);
        const inherited = previous === undefined ? mat4.identity() : corrections.get(previous)!;
        const delta = mat4.multiply(
          mat4.multiply(mat4.inverse(inherited), rotation(control.rotation)),
          align,
        );
        local.set(index, pivot(bones[index].position, delta));
      }
      // The shin's rest-axis correction must stop at the ankle. Otherwise
      // straightening the scanned leg also tilts its shoe through the floor.
      const kneel = Math.max(0, Math.min(1, (targets.knees[side].rotation[0] - 1.25) / 1.15));
      const ankle =
        kneel * (Math.PI - targets.legs[side].rotation[0] - targets.knees[side].rotation[0]);
      const foot = get('foot.' + suffix);
      local.set(
        foot,
        pivot(
          bones[foot].position,
          mat4.multiply(mat4.inverse(corrections.get(shin)!), mat4.rotationX(ankle)),
        ),
      );
    }
    const visiting = new Set<number>();
    const finished = new Set<number>();
    const evaluate = (index: number): Float32Array => {
      if (finished.has(index)) return deform[index];
      if (visiting.has(index)) throw new Error('角色蒙皮骨骼层级循环。');
      visiting.add(index);
      const bone = bones[index];
      const leg = /^thigh\./.test(bone.name);
      const parent = bone.parent < 0 || leg ? mat4.translation([0, dy, 0]) : evaluate(bone.parent);
      let delta = local.get(index) || mat4.identity();
      if (leg) {
        const side = bone.name.endsWith('.R') ? 0 : 1;
        // Procedural walking lifts a hip in addition to its rotation.
        const legControl = targets.legs[side];
        delta = mat4.multiply(
          mat4.translation([
            0,
            legControl.position[1] - targets.body.position[1],
            legControl.position[2],
          ]),
          delta,
        );
      }
      deform[index] = mat4.multiply(parent, delta);
      visiting.delete(index);
      finished.add(index);
      matrices.set(mat4.multiply(deform[index], baseline[index]), index * 16);
      return deform[index];
    };
    bones.forEach((_, index) => evaluate(index));
    const body = transform(targets.body);
    if (skeleton.camera && targets.camera) {
      const { bone, center } = skeleton.camera;
      deform[bone] = mat4.translate(
        mat4.multiply(body, transform(targets.camera)),
        center.map((v) => -v),
      );
      matrices.set(mat4.multiply(deform[bone], baseline[bone]), bone * 16);
    }
    // The inherited kneel lowers the hips before the shoes finish folding.
    // Lift the entire pose through that transition, including all prop sockets.
    const ground = groundContact(matrices);
    deform.forEach((matrix, index) => {
      matrix[13] += ground;
      matrices[index * 16 + 13] += ground;
    });
    body[13] += ground;
    targets.body.matrix = body;
    for (const [side, suffix] of [
      [0, 'R'],
      [1, 'L'],
    ] as const) {
      const arm = mat4.multiply(body, transform(targets.arms[side]));
      const elbow = mat4.multiply(arm, transform(targets.elbows[side]));
      socket(
        targets.hands[side],
        elbow,
        'hand.' + suffix,
        corrections.get(get('forearm.' + suffix)),
      );
      const leg = transform(targets.legs[side]);
      leg[13] += ground;
      targets.legs[side].matrix = leg;
      socket(targets.knees[side], leg, 'shin.' + suffix, corrections.get(get('shin.' + suffix)));
      const knee = mat4.multiply(leg, targets.knees[side].matrix!);
      socket(
        targets.knees[side].children[0],
        knee,
        'foot.' + suffix,
        corrections.get(get('shin.' + suffix)),
        true,
      );
    }
  };
}
