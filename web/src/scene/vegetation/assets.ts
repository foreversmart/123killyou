import type { Geometry } from '@/scene/world/types';

type Range = {
  vertexOffset: number;
  vertexCount: number;
  indexOffset: number;
  indexCount: number;
};

export async function loadVegetation() {
  const request = async (name: string) => {
    const response = await fetch('/art/vegetation/' + name, {
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error('植被素材加载失败：' + name);
    return response;
  };
  const manifest = (await (await request('vegetation.json')).json()) as {
    binary: string;
    meshes: Record<string, Range>;
  };
  const binary = await (await request(manifest.binary)).arrayBuffer();
  return new Map<string, Geometry>(
    Object.entries(manifest.meshes).map(([name, range]) => {
      if (range.vertexCount % 16 || range.indexCount % 3)
        throw new Error('植被模型数据不完整：' + name);
      return [
        name,
        {
          vertices: new Float32Array(binary, range.vertexOffset, range.vertexCount),
          indices: new Uint32Array(binary, range.indexOffset, range.indexCount),
        },
      ];
    }),
  );
}
