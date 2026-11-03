function blendChannel(name) {
  // These bones inherit the same control in the current game. Consolidating
  // their weights before limiting to four avoids discarding a real limb at a seam.
  if (/finger|thumb/.test(name)) return 'hand.' + (name.includes('.R') ? 'R' : 'L');
  if (/clavicle|spine|chest|neck/.test(name)) return 'pelvis';
  if (/toe\./.test(name)) return 'foot.' + (name.includes('.R') ? 'R' : 'L');
  return name;
}

export function smoothSkinWeights(vertices, indices, source, regions, bones, passes = 40) {
  const names = new Map(bones.map((bone, index) => [bone.name, index]));
  const channels = bones.length;
  const groups = new Map(),
    mapping = [];
  for (let vertex = 0; vertex < source.length; vertex++) {
    const point = Array.from(vertices.subarray(vertex * 16, vertex * 16 + 3));
    const key = regions[vertex] + ':' + point.map((value) => Math.round(value * 100000)).join(',');
    if (!groups.has(key))
      groups.set(key, { index: groups.size, vertices: [], neighbors: new Set() });
    const group = groups.get(key);
    group.vertices.push(vertex);
    mapping[vertex] = group.index;
  }
  const list = [...groups.values()];
  for (let triangle = 0; triangle < indices.length; triangle += 3)
    for (let corner = 0; corner < 3; corner++) {
      const a = mapping[indices[triangle + corner]],
        b = mapping[indices[triangle + ((corner + 1) % 3)]];
      if (a !== b) {
        list[a].neighbors.add(b);
        list[b].neighbors.add(a);
      }
    }
  let weights = new Float64Array(list.length * channels);
  for (const group of list)
    for (const vertex of group.vertices) {
      const region = regions[vertex];
      const rawY = vertices[vertex * 16 + 1] / 0.85 - 1;
      const influences = new Map();
      for (const [joint, value] of source[vertex]) {
        let name = blendChannel(bones[joint].name);
        // The hanging palm touches the trousers in the scan. Its separately
        // classified skin is the only surface that may use hand weights there.
        if (!region && rawY < -0.02 && vertices[vertex * 16] > 0.05 && /arm\.L|hand\.L/.test(name))
          name = 'thigh.L';
        if (!region && rawY > 0.38 && name === 'hand.R') name = 'pelvis';
        const target = names.get(name);
        influences.set(target, (influences.get(target) || 0) + value);
      }
      // The shoe soles are authored as a separate, nearly rigid surface in
      // the supplied rig. Keep them on the ankle bone after simplification so
      // the runtime foot correction cannot shear the shoe into the shin.
      if (region === 0 && rawY < -0.83) {
        const foot = names.get('foot.' + (vertices[vertex * 16] < 0 ? 'R' : 'L'));
        if (foot !== undefined) influences.clear(), influences.set(foot, 1);
      }
      const chosen =
        region === 2
          ? [[names.get('neutral_bone'), 1]]
          : region === 1
            ? [[names.get('hand.L'), 1]]
            : [...influences];
      for (const [joint, value] of chosen)
        weights[group.index * channels + joint] += value / group.vertices.length;
    }
  for (let pass = 0; pass < passes; pass++) {
    const next = new Float64Array(weights.length);
    for (const group of list) {
      const offset = group.index * channels;
      let total = 0;
      for (const neighbor of group.neighbors) {
        const value = 1 / Math.sqrt(list[neighbor].neighbors.size);
        total += value;
        for (let joint = 0; joint < channels; joint++)
          next[offset + joint] += weights[neighbor * channels + joint] * value;
      }
      for (let joint = 0; joint < channels; joint++)
        next[offset + joint] = group.neighbors.size
          ? weights[offset + joint] * 0.4 + (next[offset + joint] / total) * 0.6
          : weights[offset + joint];
    }
    weights = next;
  }
  const packed = new Float32Array(source.length * 8);
  for (let vertex = 0; vertex < source.length; vertex++) {
    const start = mapping[vertex] * channels;
    const influences = Array.from(weights.subarray(start, start + channels), (value, joint) => [
      joint,
      value,
    ])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const total = influences.reduce((sum, [, value]) => sum + value, 0);
    if (total < 0.00001) throw new Error('The rebound scan contains an unweighted vertex.');
    influences.forEach(([joint, value], slot) => {
      packed[vertex * 8 + slot] = joint;
      packed[vertex * 8 + 4 + slot] = value / total;
    });
    const y = vertices[vertex * 16 + 1] / 0.85 - 1;
    if (regions[vertex] === 0 && y < -0.7) {
      const footName = vertices[vertex * 16] < 0 ? 'foot.R' : 'foot.L';
      const foot = names.get(footName);
      packed.fill(0, vertex * 8, vertex * 8 + 8);
      packed[vertex * 8] = foot;
      packed[vertex * 8 + 4] = 1;
    }
  }
  return packed;
}
