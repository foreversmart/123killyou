import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { mat4, vec3 } from 'wgpu-matrix';

// Offline, uncompressed glTF reader. Production only loads the packed local mesh.
export async function readGltf(file) {
  const bytes = await readFile(file);
  let json, buffers;
  if (file.endsWith('.glb')) {
    const length = bytes.readUInt32LE(12);
    json = JSON.parse(bytes.subarray(20, 20 + length));
    buffers = [bytes.subarray(28 + length)];
  } else {
    json = JSON.parse(bytes);
    buffers = await Promise.all(
      json.buffers.map((b) => readFile(path.join(path.dirname(file), b.uri))),
    );
  }
  const arrays = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  function accessor(index) {
    const a = json.accessors[index],
      bv = json.bufferViews[a.bufferView];
    const Type = arrays[a.componentType],
      width = widths[a.type];
    if (!Type || a.sparse) throw new Error('Unsupported source accessor');
    const data = buffers[bv.buffer];
    const start = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const stride = bv.byteStride || width * Type.BYTES_PER_ELEMENT;
    const out = new Type(a.count * width);
    for (let i = 0; i < a.count; i++) {
      const slice = data.subarray(
        start + i * stride,
        start + i * stride + width * Type.BYTES_PER_ELEMENT,
      );
      out.set(new Type(Uint8Array.from(slice).buffer), i * width);
    }
    return out;
  }
  function texture(index) {
    if (index === undefined) return undefined;
    const tex = json.textures[index];
    const im = json.images[tex.extensions?.EXT_texture_webp?.source ?? tex.source];
    if (im.uri) return path.join(path.dirname(file), im.uri);
    const view = json.bufferViews[im.bufferView];
    return buffers[view.buffer].subarray(
      view.byteOffset || 0,
      (view.byteOffset || 0) + view.byteLength,
    );
  }
  const meshes = [];
  function visit(index, parent) {
    const n = json.nodes[index];
    let local = n.matrix || mat4.fromQuat(n.rotation || [0, 0, 0, 1]);
    if (!n.matrix) {
      local = mat4.scale(local, n.scale || [1, 1, 1]);
      local[12] = n.translation?.[0] || 0;
      local[13] = n.translation?.[1] || 0;
      local[14] = n.translation?.[2] || 0;
    }
    const matrix = mat4.multiply(parent, local);
    if (n.mesh !== undefined) {
      for (const p of json.meshes[n.mesh].primitives) {
        if ((p.mode ?? 4) !== 4) continue;
        const positions = accessor(p.attributes.POSITION);
        const normals = accessor(p.attributes.NORMAL);
        // glTF skin vertices are in bind space; ignore the skinned mesh node transform.
        const meshMatrix = n.skin === undefined ? matrix : mat4.identity();
        const normalMatrix = mat4.transpose(mat4.inverse(meshMatrix));
        for (let i = 0; i < positions.length; i += 3) {
          positions.set(vec3.transformMat4(positions.subarray(i, i + 3), meshMatrix), i);
          normals.set(
            vec3.normalize(vec3.transformMat4Upper3x3(normals.subarray(i, i + 3), normalMatrix)),
            i,
          );
        }
        const textureInfo = json.materials[p.material]?.pbrMetallicRoughness?.baseColorTexture;
        const uv = accessor(p.attributes['TEXCOORD_' + (textureInfo?.texCoord || 0)]);
        const uvTransform = textureInfo?.extensions?.KHR_texture_transform;
        if (uvTransform)
          for (let i = 0; i < uv.length; i++)
            uv[i] = uv[i] * (uvTransform.scale?.[i % 2] ?? 1) + (uvTransform.offset?.[i % 2] || 0);
        meshes.push({
          name: n.name,
          positions,
          normals,
          uv,
          indices: accessor(p.indices),
          material: p.material,
          skinned: n.skin !== undefined,
          skin: n.skin,
          joints: p.attributes.JOINTS_0 === undefined ? undefined : accessor(p.attributes.JOINTS_0),
          weights:
            p.attributes.WEIGHTS_0 === undefined ? undefined : accessor(p.attributes.WEIGHTS_0),
        });
      }
    }
    n.children?.forEach((child) => visit(child, matrix));
  }
  json.scenes[json.scene || 0].nodes.forEach((n) => visit(n, mat4.identity()));
  return { json, meshes, texture, accessor };
}
