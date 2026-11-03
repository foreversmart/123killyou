import type { Geometry } from '@/scene/world/types';

/** Remove stray moving-bone weights from Lu Chen's otherwise fixed arms. */
export function fixHandSkin(skin: NonNullable<Geometry['skin']>) {
  const { bones } = skin.skeleton;
  const fixed = bones.map((_, index) => {
    for (let current = index; current >= 0; current = bones[current].parent)
      if (/^upper_arm\./.test(bones[current].name)) return true;
    return false;
  });
  const moving = bones.map((_, index) => {
    for (let current = index; current >= 0; current = bones[current].parent)
      if (/^(thigh\.|head$)/.test(bones[current].name)) return true;
    return false;
  });
  for (let vertex = 0; vertex < skin.weights.length / 4; vertex++) {
    const offset = vertex * 4;
    let armWeight = 0,
      remaining = 0;
    for (let slot = 0; slot < 4; slot++) {
      const index = offset + slot;
      if (fixed[skin.joints[index]]) armWeight += skin.weights[index];
      if (!moving[skin.joints[index]]) remaining += skin.weights[index];
    }
    if (armWeight < 0.5) continue;
    for (let slot = 0; slot < 4; slot++) {
      const index = offset + slot;
      skin.weights[index] = moving[skin.joints[index]] ? 0 : skin.weights[index] / remaining;
    }
  }
}
