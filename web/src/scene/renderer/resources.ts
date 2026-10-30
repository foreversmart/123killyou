import type { Geometry } from '@/scene/world/types';

const ROOT = '/art/world/';
type Surface = { id: string; albedo: string; normal: string; arm: string };
type MeshRange = {
  vertexOffset: number;
  vertexCount: number;
  indexOffset: number;
  indexCount: number;
};
type Manifest = {
  surfaces: Surface[];
  meshes: Record<string, MeshRange>;
  binary: string;
  skies: string[];
};
type Source = { manifest: Manifest; meshes: Map<string, Geometry>; images: Map<string, Blob> };
let pending: Promise<Source> | undefined;

async function request(file: string) {
  const response = await fetch(ROOT + file, { signal: AbortSignal.timeout(30000) });
  if (!response.ok)
    throw new Error('场景素材加载失败：' + file + '（' + response.status + '），请重新载入。');
  return response;
}

async function loadSource(): Promise<Source> {
  const manifest: Manifest = await (await request('library.json')).json();
  const files = [
    ...manifest.skies,
    ...manifest.surfaces.flatMap((s) => [s.albedo, s.normal, s.arm]),
  ];
  const [binary, images] = await Promise.all([
    request(manifest.binary).then((r) => r.arrayBuffer()),
    Promise.all(files.map(async (file) => [file, await (await request(file)).blob()] as const)),
  ]);
  const meshes = new Map<string, Geometry>();
  for (const [id, range] of Object.entries(manifest.meshes)) {
    if (range.vertexCount % 16 || range.indexCount % 3)
      throw new Error('场景模型数据不完整：' + id + '，请重新载入。');
    meshes.set(id, {
      vertices: new Float32Array(binary, range.vertexOffset, range.vertexCount),
      indices: new Uint32Array(binary, range.indexOffset, range.indexCount),
    });
  }
  return { manifest, meshes, images: new Map(images) };
}

export async function createResources(device: GPUDevice) {
  pending ??= loadSource().catch((error) => {
    pending = undefined;
    throw error;
  });
  const source = await pending;
  const textures: GPUTexture[] = [];
  async function array(files: string[], width: number, height: number, color = false) {
    const levels = Math.floor(Math.log2(Math.max(width, height))) + 1;
    const texture = device.createTexture({
      label: files[0],
      size: [width, height, files.length],
      mipLevelCount: levels,
      format: color ? 'rgba8unorm-srgb' : 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    textures.push(texture);
    // Generate filtered mip levels before first render; no network work in the frame loop.
    for (const [layer, file] of files.entries()) {
      const bitmap = await createImageBitmap(source.images.get(file)!, {
        colorSpaceConversion: 'none',
      });
      try {
        for (let level = 0; level < levels; level++) {
          const w = Math.max(1, width >> level),
            h = Math.max(1, height >> level);
          const canvas = new OffscreenCanvas(w, h);
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(bitmap, 0, 0, w, h);
          device.queue.copyExternalImageToTexture(
            { source: canvas },
            { texture, origin: [0, 0, layer], mipLevel: level },
            [w, h],
          );
        }
      } finally {
        bitmap.close();
      }
    }
    return texture.createView({ dimension: '2d-array' });
  }
  try {
    const albedo = await array(
      source.manifest.surfaces.map((s) => s.albedo),
      512,
      512,
      true,
    );
    const normal = await array(
      source.manifest.surfaces.map((s) => s.normal),
      512,
      512,
    );
    const arm = await array(
      source.manifest.surfaces.map((s) => s.arm),
      512,
      512,
    );
    const sky = await array(source.manifest.skies, 2048, 1024, true);
    const sampler = device.createSampler({
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      maxAnisotropy: 4,
    });
    return {
      albedo,
      normal,
      arm,
      sky,
      sampler,
      meshes: source.meshes,
      dispose: () => textures.forEach((texture) => texture.destroy()),
    };
  } catch (error) {
    textures.forEach((texture) => texture.destroy());
    throw error;
  }
}
