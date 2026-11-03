const fingerGroups = new Map([
  ['index', 1],
  ['middle', 2],
  ['ring', 3],
  ['pinky', 4],
]);

function normalizedSide(value) {
  return value === 'l' ? 'L' : 'R';
}

/**
 * Convert the supplied Lin Lan armature names to the semantic names used by
 * the runtime rig. The source deliberately remains untouched; only the
 * packed manifest needs the stable names used by skin_pose and actions.
 */
export function normalizeLinLanSkeleton(gltf) {
  const seen = new Set();
  for (const node of gltf.json.nodes) {
    const source = node.name || '';
    let name = source;
    let match = source.match(/^(index|middle|ring|pinky)_(01|02|03)_([lr])$/);
    if (match) {
      const [, group, segment, side] = match;
      const suffix = segment === '01' ? '' : segment === '02' ? '_mid' : '_tip';
      name = `finger_${fingerGroups.get(group)}.${normalizedSide(side)}${suffix}`;
    } else if ((match = source.match(/^thumb_(01|02|03)_([lr])$/))) {
      const [, segment, side] = match;
      const suffix = segment === '01' ? '' : segment === '02' ? '_tip' : '_end';
      name = `thumb.${normalizedSide(side)}${suffix}`;
    } else if ((match = source.match(/^(upper_arm|forearm|hand|thigh|shin|foot|toe)_([lr])$/))) {
      const [, group, side] = match;
      name = `${group}.${normalizedSide(side)}`;
    }
    if (seen.has(name)) throw new Error(`Lin Lan 骨骼名称重复：${name}`);
    seen.add(name);
    node.name = name;
  }
  for (const required of [
    'root',
    'pelvis',
    'spine',
    'chest',
    'neck',
    'head',
    'neutral_bone',
    'upper_arm.L',
    'upper_arm.R',
    'forearm.L',
    'forearm.R',
    'hand.L',
    'hand.R',
    'finger_1.L',
    'finger_1.R',
    'finger_1.L_tip',
    'finger_1.R_tip',
    'thumb.L',
    'thumb.R',
    'thumb.L_tip',
    'thumb.R_tip',
    'thigh.L',
    'thigh.R',
    'shin.L',
    'shin.R',
    'foot.L',
    'foot.R',
    'toe.L',
    'toe.R',
  ]) {
    if (!seen.has(required)) throw new Error(`Lin Lan 缺少动作骨骼：${required}`);
  }
  return gltf;
}

/** Preserve the supplied skin bind matrices; the rig is already authored in
 * the same Blender axes as the packed runtime surface. */
export function nativeLinLanSkin(gltf, skin) {
  if (skin.inverseBindMatrices === undefined)
    throw new Error('Lin Lan 缺少原生逆绑定矩阵。');
  return {
    joints: skin.joints,
    nodes: gltf.json.nodes.map((node) => ({
      name: node.name,
      children: node.children,
      matrix: node.matrix,
      translation: node.translation,
      rotation: node.rotation,
      scale: node.scale,
    })),
    inverseBindMatrices: Array.from(gltf.accessor(skin.inverseBindMatrices)),
  };
}
