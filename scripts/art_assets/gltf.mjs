import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { mat4, vec3 } from 'wgpu-matrix';

function zipEntry(bytes, requestedName) {
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const localSignature = 0x04034b50;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start = Math.max(0, bytes.byteLength - 0xffff - 22);
  let eocd = -1;
  for (let offset = bytes.byteLength - 22; offset >= start; offset--) {
    if (view.getUint32(offset, true) === eocdSignature) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error('ZIP archive is missing its end record');
  const count = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  let offset = centralOffset;
  for (let entry = 0; entry < count; entry++) {
    if (view.getUint32(offset, true) !== centralSignature)
      throw new Error('ZIP central directory is invalid');
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (name !== requestedName) continue;
    if (view.getUint32(localOffset, true) !== localSignature)
      throw new Error('ZIP local file header is invalid');
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) return Buffer.from(compressed);
    if (method === 8) return inflateRawSync(compressed);
    throw new Error(`Unsupported ZIP compression method: ${method}`);
  }
  throw new Error(`ZIP entry not found: ${requestedName}`);
}

async function readSourceBytes(file) {
  const bytes = await readFile(file);
  if (!file.endsWith('.zip')) return bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdSignature = 0x06054b50;
  const start = Math.max(0, bytes.byteLength - 0xffff - 22);
  let eocd = -1;
  for (let offset = bytes.byteLength - 22; offset >= start; offset--) {
    if (view.getUint32(offset, true) === eocdSignature) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error(`${file}: invalid ZIP archive`);
  const count = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  let offset = centralOffset;
  let candidate;
  for (let entry = 0; entry < count; entry++) {
    if (view.getUint32(offset, true) !== 0x02014b50)
      throw new Error(`${file}: invalid ZIP directory`);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name.endsWith('.glb')) candidate = name;
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (!candidate) throw new Error(`${file}: ZIP archive does not contain a GLB`);
  return zipEntry(bytes, candidate);
}

// Offline glTF reader. Source assets may be shipped as ZIP archives; the
// packed runtime library remains the browser-facing representation.
export async function readGltf(file) {
  const bytes = await readSourceBytes(file);
  let json, buffers;
  if (file.endsWith('.glb') || file.endsWith('.zip')) {
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
