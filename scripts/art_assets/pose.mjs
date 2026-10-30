import { mat4, vec3 } from 'wgpu-matrix';

// Bake the licensed idle pose offline, then retain anatomical rigid parts for the story rig.
export function bodyParts(gltf, scale) {
  const { json, accessor } = gltf;
  const pose = json.nodes.map((n) => ({
    t: n.translation || [0, 0, 0],
    r: n.rotation || [0, 0, 0, 1],
    s: n.scale || [1, 1, 1],
  }));
  const animation = json.animations.find((a) => a.name === 'idle_neutral_01') || json.animations[0];
  for (const channel of animation.channels) {
    const sampler = animation.samplers[channel.sampler];
    const values = accessor(sampler.output),
      size = channel.target.path === 'rotation' ? 4 : 3;
    const key = { translation: 't', rotation: 'r', scale: 's' }[channel.target.path];
    if (key) pose[channel.target.node][key] = [...values.slice(0, size)];
  }
  const world = [];
  function visit(index, parent) {
    const p = pose[index];
    let m = mat4.scale(mat4.fromQuat(p.r), p.s);
    m[12] = p.t[0];
    m[13] = p.t[1];
    m[14] = p.t[2];
    world[index] = mat4.multiply(parent, m);
    json.nodes[index].children?.forEach((child) => visit(child, world[index]));
  }
  json.scenes[json.scene || 0].nodes.forEach((i) => visit(i, mat4.identity()));
  const result = [];
  for (const mesh of gltf.meshes.filter((m) => json.materials[m.material].name === 'body')) {
    const skin = json.skins[mesh.skin],
      inverse = accessor(skin.inverseBindMatrices);
    const matrices = skin.joints.map((joint, i) =>
      mat4.multiply(world[joint], inverse.slice(i * 16, i * 16 + 16)),
    );
    const positions = new Float32Array(mesh.positions.length),
      normals = new Float32Array(mesh.normals.length);
    const category = [];
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const p = [0, 0, 0],
        n = [0, 0, 0];
      let strongest = -1,
        name = '';
      for (let w = 0; w < 4; w++) {
        const weight = mesh.weights[i * 4 + w],
          joint = mesh.joints[i * 4 + w];
        const tp = vec3.transformMat4(mesh.positions.slice(i * 3, i * 3 + 3), matrices[joint]);
        const tn = vec3.transformMat4Upper3x3(
          mesh.normals.slice(i * 3, i * 3 + 3),
          matrices[joint],
        );
        for (let c = 0; c < 3; c++) {
          p[c] += tp[c] * weight * scale;
          n[c] += tn[c] * weight;
        }
        if (weight > strongest) {
          strongest = weight;
          name = json.nodes[skin.joints[joint]].name;
        }
      }
      positions.set(p, i * 3);
      normals.set(vec3.normalize(n), i * 3);
      const side = name.includes(' L ') ? 'left' : 'right';
      category.push(
        /UpperArm|Forearm|Hand|Finger/.test(name)
          ? side + '_arm'
          : /Thigh|Calf|Foot|Toe/.test(name)
            ? side + '_leg'
            : 'torso',
      );
    }
    for (const part of ['torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg']) {
      const indices = [];
      for (let i = 0; i < mesh.indices.length; i += 3) {
        const tri = [...mesh.indices.slice(i, i + 3)],
          labels = tri.map((i) => category[i]);
        const label = labels.find((l) => labels.filter((v) => v === l).length >= 2) || labels[0];
        if (label === part) indices.push(...tri);
      }
      const side = part.startsWith('left') ? 1 : -1;
      const anchor = part.endsWith('arm')
        ? [side * 0.215, 1.32, 0]
        : part.endsWith('leg')
          ? [side * 0.095, 0.82, 0]
          : [0, 0, 0];
      const local = positions.map((v, i) => v - anchor[i % 3]);
      result.push({
        part,
        mesh: { ...mesh, positions: local, normals, indices: new Uint32Array(indices) },
      });
    }
  }
  return result;
}
