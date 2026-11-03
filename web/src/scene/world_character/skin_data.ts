import { mat4 } from 'wgpu-matrix';
import type { Geometry, SkinBone, V3 } from '@/scene/world/types';

type SkinNode = {
  name?: string;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
};
export type SkinMetadata = {
  mesh: string;
  joints: number[];
  nodes: SkinNode[];
  inverseBindMatrices: number[];
  influences: string;
  scale: number;
  offset: V3;
  camera?: { bone: string; center: V3 };
};

/** Keep the exported rest axes and inverse binds; normalize both into game metres. */
export function decodeCharacterSkin(
  metadata: SkinMetadata,
  data: ArrayBuffer,
  vertexCount: number,
): NonNullable<Geometry['skin']> {
  if (data.byteLength !== vertexCount * 8 * 4) throw new Error('角色蒙皮顶点数量不匹配。');
  const { nodes, joints } = metadata;
  if (!joints.length || metadata.inverseBindMatrices.length !== joints.length * 16)
    throw new Error('角色骨骼绑定数据不完整。');
  const parents = nodes.map(() => -1);
  nodes.forEach((node, index) => node.children?.forEach((child) => (parents[child] = index)));
  const globals = new Map<number, Float32Array>();
  const visiting = new Set<number>();
  function global(index: number): Float32Array {
    const existing = globals.get(index);
    if (existing) return existing;
    if (!nodes[index] || visiting.has(index)) throw new Error('角色骨骼层级无效。');
    visiting.add(index);
    const node = nodes[index];
    const local = node.matrix
      ? Float32Array.from(node.matrix)
      : mat4.scale(mat4.fromQuat(node.rotation || [0, 0, 0, 1]), node.scale || [1, 1, 1]);
    if (!node.matrix) local.set(node.translation || [0, 0, 0], 12);
    const result = parents[index] < 0 ? local : mat4.multiply(global(parents[index]), local);
    globals.set(index, result);
    visiting.delete(index);
    return result;
  }
  const normalize = mat4.scaling([metadata.scale, metadata.scale, metadata.scale]);
  normalize.set(metadata.offset, 12);
  const denormalize = mat4.inverse(normalize);
  const bones: SkinBone[] = joints.map((index, boneIndex) => {
    const bind = mat4.multiply(normalize, global(index));
    let parent = parents[index];
    while (parent >= 0 && !joints.includes(parent)) parent = parents[parent];
    const inverseBind = mat4.multiply(
      Float32Array.from(metadata.inverseBindMatrices.slice(boneIndex * 16, boneIndex * 16 + 16)),
      denormalize,
    );
    if (![...bind, ...inverseBind].every(Number.isFinite)) throw new Error('角色骨骼矩阵无效。');
    return {
      name: nodes[index].name || String(index),
      parent: joints.indexOf(parent),
      bind,
      inverseBind,
      position: [bind[12], bind[13], bind[14]],
    };
  });
  const packed = new Float32Array(data);
  const jointData = new Float32Array(vertexCount * 4);
  const weights = new Float32Array(vertexCount * 4);
  for (let i = 0; i < vertexCount; i++) {
    jointData.set(packed.subarray(i * 8, i * 8 + 4), i * 4);
    weights.set(packed.subarray(i * 8 + 4, i * 8 + 8), i * 4);
    const sum = weights.subarray(i * 4, i * 4 + 4).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.001) throw new Error('角色蒙皮权重无效。');
    for (let j = 0; j < 4; j++)
      if (
        !Number.isInteger(jointData[i * 4 + j]) ||
        jointData[i * 4 + j] < 0 ||
        jointData[i * 4 + j] >= bones.length ||
        !Number.isFinite(weights[i * 4 + j]) ||
        weights[i * 4 + j] < 0
      )
        throw new Error('角色蒙皮骨骼索引或权重无效。');
  }
  const cameraBone =
    metadata.camera && bones.findIndex((bone) => bone.name === metadata.camera!.bone);
  if (metadata.camera && (cameraBone! < 0 || !metadata.camera.center.every(Number.isFinite)))
    throw new Error('角色相机骨骼数据无效。');
  return {
    joints: jointData,
    weights,
    skeleton: {
      bones,
      camera: metadata.camera ? { bone: cameraBone!, center: metadata.camera.center } : undefined,
    },
  };
}
