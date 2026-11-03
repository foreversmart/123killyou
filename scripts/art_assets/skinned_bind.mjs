import { mat4, quat, vec3 } from 'wgpu-matrix';

// Current scan landmarks in Blender's X / depth / height axes. These fit the
// asymmetric shoulders, camera grip, hanging palm and offset feet of Lin Lan.
const landmarks = {
  root: [
    [0, 0, -1],
    [0, 0, -0.8],
  ],
  pelvis: [
    [-0.085, 0.055, 0.065],
    [-0.085, 0.055, 0.205],
  ],
  spine: [
    [-0.085, 0.055, 0.205],
    [-0.09, 0.06, 0.385],
  ],
  chest: [
    [-0.09, 0.06, 0.385],
    [-0.095, 0.05, 0.625],
  ],
  neck: [
    [-0.095, 0.05, 0.625],
    [-0.095, 0.025, 0.735],
  ],
  head: [
    [-0.095, 0.025, 0.735],
    [-0.105, 0.025, 0.98],
  ],
  'clavicle.R': [
    [-0.095, 0.05, 0.595],
    [-0.275, 0.065, 0.585],
  ],
  'upper_arm.R': [
    [-0.275, 0.065, 0.585],
    [-0.35, 0.06, 0.295],
  ],
  'forearm.R': [
    [-0.35, 0.06, 0.295],
    [-0.25, -0.115, 0.295],
  ],
  'hand.R': [
    [-0.25, -0.115, 0.295],
    [-0.15, -0.175, 0.29],
  ],
  'clavicle.L': [
    [-0.095, 0.05, 0.595],
    [0.095, 0.085, 0.58],
  ],
  'upper_arm.L': [
    [0.095, 0.085, 0.58],
    [0.162, 0.075, 0.295],
  ],
  'forearm.L': [
    [0.162, 0.075, 0.295],
    [0.168, -0.005, -0.025],
  ],
  'hand.L': [
    [0.168, -0.005, -0.025],
    [0.16, -0.005, -0.145],
  ],
  'thigh.R': [
    [-0.185, 0.065, 0.065],
    [-0.17, 0.075, -0.43],
  ],
  'shin.R': [
    [-0.17, 0.075, -0.43],
    [-0.15, 0.12, -0.86],
  ],
  'foot.R': [
    [-0.15, 0.12, -0.86],
    [-0.17, -0.035, -0.957],
  ],
  'toe.R': [
    [-0.17, -0.035, -0.957],
    [-0.18, -0.105, -0.96],
  ],
  'thigh.L': [
    [0.025, 0.025, 0.06],
    [0.13, -0.025, -0.43],
  ],
  'shin.L': [
    [0.13, -0.025, -0.43],
    [0.27, 0.005, -0.865],
  ],
  'foot.L': [
    [0.27, 0.005, -0.865],
    [0.32, -0.13, -0.957],
  ],
  'toe.L': [
    [0.32, -0.13, -0.957],
    [0.34, -0.205, -0.96],
  ],
};

export function skinWorld(nodes) {
  const parents = nodes.map(() => -1);
  nodes.forEach((node, index) => node.children?.forEach((child) => (parents[child] = index)));
  const matrices = new Map();
  function global(index) {
    if (matrices.has(index)) return matrices.get(index);
    const node = nodes[index];
    let local = node.matrix
      ? Float32Array.from(node.matrix)
      : mat4.scale(mat4.fromQuat(node.rotation || [0, 0, 0, 1]), node.scale || [1, 1, 1]);
    if (!node.matrix) local.set(node.translation || [0, 0, 0], 12);
    const world = parents[index] < 0 ? local : mat4.multiply(global(parents[index]), local);
    matrices.set(index, world);
    return world;
  }
  nodes.forEach((_, index) => global(index));
  return { parents, matrices };
}

export function fittedScanSkin(json, skin) {
  const { nodes } = json;
  const { parents, matrices } = skinWorld(nodes);
  const names = new Map(nodes.map((node, index) => [node.name, index]));
  const mirror = mat4.scaling([-1, 1, 1]);
  const current = new Map(matrices);
  // The source arm rest poses are assigned to the opposite physical sides.
  // Newer exports already use physical left/right positions; only mirror the
  // older scan convention when its left upper arm is on the negative X side.
  const leftArm = names.get('upper_arm.L');
  const mirrorArms = leftArm !== undefined && matrices.get(leftArm)[12] < 0;
  if (mirrorArms) {
    for (const [index, node] of nodes.entries()) {
      if (!/^(clavicle|upper_arm|forearm|hand|finger_|thumb).*\.[LR](?:_mid|_tip|_end)?$/.test(node.name))
        continue;
      const opposite = node.name.replace(/\.([LR])/, (_, side) => '.' + (side === 'L' ? 'R' : 'L'));
      current.set(
        index,
        mat4.multiply(mat4.multiply(mirror, matrices.get(names.get(opposite))), mirror),
      );
    }
  }
  const fitted = new Map(current);
  const point = (value) => [value[0], value[2], -value[1]];
  for (const [name, [head, tail]] of Object.entries(landmarks)) {
    const index = names.get(name);
    // Some source armatures omit clavicle joints and start the arm at the
    // chest. The runtime does not require clavicles, so leave that joint at
    // its fitted source transform while aligning the remaining landmarks.
    if (index === undefined) continue;
    const original = current.get(index);
    const target = vec3.normalize(vec3.subtract(point(tail), point(head)));
    const align = mat4.fromQuat(quat.rotationTo(vec3.normalize(original.subarray(4, 7)), target));
    const matrix = mat4.multiply(align, original);
    matrix.set(point(head), 12);
    fitted.set(index, matrix);
  }
  for (const side of ['R', 'L']) {
    const hand = current.get(names.get('hand.' + side));
    const [head, tail] = landmarks['hand.' + side].map(point);
    const fingers = nodes.flatMap((node, index) =>
      /finger|thumb/.test(node.name) && node.name.includes('.' + side) ? [index] : [],
    );
    const extent = Math.max(
      ...fingers.map((index) =>
        vec3.distance(hand.subarray(12, 15), current.get(index).subarray(12, 15)),
      ),
    );
    const align = mat4.fromQuat(
      quat.rotationTo(
        vec3.normalize(hand.subarray(4, 7)),
        vec3.normalize(vec3.subtract(tail, head)),
      ),
    );
    const scale = vec3.distance(head, tail) / extent;
    const delta = mat4.multiply(
      mat4.multiply(mat4.translation(head), mat4.scale(align, [scale, scale, scale])),
      mat4.translation(Array.from(hand.subarray(12, 15), (value) => -value)),
    );
    for (const index of fingers) fitted.set(index, mat4.multiply(delta, current.get(index)));
  }
  return {
    joints: skin.joints,
    nodes: nodes.map((node, index) => ({
      name: node.name,
      children: node.children,
      matrix: Array.from(
        parents[index] < 0
          ? fitted.get(index)
          : mat4.multiply(mat4.inverse(fitted.get(parents[index])), fitted.get(index)),
      ),
    })),
    inverseBindMatrices: skin.joints.flatMap((index) =>
      Array.from(mat4.inverse(fitted.get(index))),
    ),
  };
}
