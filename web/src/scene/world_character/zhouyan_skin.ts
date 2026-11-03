import type { Geometry, V3 } from '@/scene/world/types';

const smooth = (low: number, high: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};

/** The supplied scan puts its hips below its knees and binds shoes to the pelvis. */
export function fitZhouyanSkin(skin: NonNullable<Geometry['skin']>, vertices: Float32Array) {
  const { bones } = skin.skeleton;
  const names = new Map(bones.map((bone, index) => [bone.name, index]));
  const landmarks: Record<string, V3> = {
    pelvis: [0, -0.02, -0.04],
    'thigh.L': [-0.075, -0.04, -0.06],
    'shin.L': [-0.1, -0.37, -0.095],
    'foot.L': [-0.071, -0.74, -0.112],
    'thigh.R': [0.085, -0.04, -0.02],
    'shin.R': [0.122, -0.37, -0.002],
    'foot.R': [0.216, -0.74, -0.007],
  };
  // These are action pivots, not a new bind pose. Keep the source bind and
  // inverse bind matrices paired so a resting mesh retains its exact shape.
  for (const [name, point] of Object.entries(landmarks)) bones[names.get(name)!].position = point;
  for (let vertex = 0; vertex < vertices.length / 16; vertex++) {
    const offset = vertex * 4;
    const x = vertices[vertex * 16],
      y = vertices[vertex * 16 + 1];
    if (y >= 0.16) continue;
    // The right shoe is offset outward while the left shoe crosses x=0.
    // Follow the two leg centres so a sole is never split between feet.
    const side = x < (1 - smooth(-0.74, -0.3, y)) * 0.07 ? 'L' : 'R';
    const pelvis = names.get('pelvis')!;
    const thigh = names.get('thigh.' + side)!;
    const shin = names.get('shin.' + side)!;
    const foot = names.get('foot.' + side)!;
    const hips = smooth(-0.16, 0.08, y);
    const knee = smooth(-0.48, -0.27, y);
    const ankle = smooth(-0.77, -0.62, y);
    const fitted = new Map<number, number>([
      [pelvis, hips],
      [thigh, (1 - hips) * knee],
      [shin, (1 - hips) * (1 - knee) * ankle],
      [foot, (1 - hips) * (1 - knee) * (1 - ankle)],
    ]);
    let preserved = 0;
    for (let slot = 0; slot < 4; slot++) {
      const index = offset + slot;
      const joint = skin.joints[index];
      // Sleeves and the hanging hand overlap the trousers. Keep their native
      // arm influences, while the garment and legs use anatomical regions.
      if (
        !/^(clavicle|upper_arm|forearm|hand|index|middle|pinky|ring|thumb)/.test(bones[joint].name)
      )
        continue;
      const weight = skin.weights[index] * smooth(-0.32, -0.18, y);
      preserved += weight;
      fitted.set(joint, (fitted.get(joint) || 0) + weight);
    }
    for (const joint of [pelvis, thigh, shin, foot])
      fitted.set(joint, fitted.get(joint)! * (1 - preserved));
    const selected = [...fitted].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = selected.reduce((sum, [, weight]) => sum + weight, 0);
    selected.forEach(([joint, weight], slot) => {
      skin.joints[offset + slot] = joint;
      skin.weights[offset + slot] = weight / total;
    });
  }
}
