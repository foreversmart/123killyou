import common from '@/scene/vegetation/foliage_common.wgsl?raw';
import shapes from '@/scene/vegetation/leaf_shapes.wgsl?raw';

// Tidewater's original four leaf clusters, baked at their original resolution.
// Data channels: coverage, brightness / 1.4, per-leaf random, one (not sRGB).
const SIZE = 1024;
const LEVELS = 11;
const tiles = [
  { grid: 4, leaves: 6, width: 0.34 },
  { grid: 4, leaves: 8, width: 0.2 },
  { grid: 3, leaves: 6, width: 0.45 },
  { grid: 3, leaves: 8, width: 0.22 },
];
const fullscreen = /* wgsl */ `
struct LeafVertex { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn leafVertex(@builtin(vertex_index) index: u32) -> LeafVertex {
  let uv = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  var o: LeafVertex;
  o.position = vec4f(uv * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0), 0.0, 1.0);
  o.uv = uv;
  return o;
}`;

function bakeShader() {
  const f = (n: number) => (Number.isInteger(n) ? `${n}.0` : String(n));
  const branches = tiles.map((tile, index) => {
    const sample = (point: string, rotation: string) =>
      index === 1
        ? `vegTwig(${point}, 3.0, ${rotation})`
        : `vegRosette(${point}, ${f(tile.grid)}, ${f(tile.leaves)}, ${f(tile.width)}, ${rotation})`;
    const samples = Array.from({ length: 4 }, (_, i) => {
      const x = ((i % 2) - 0.5) / SIZE;
      const y = (Math.floor(i / 2) - 0.5) / SIZE;
      return `{
        let q = local + vec2f(${f(x)}, ${f(y)});
        let A = ${sample('q', '0.0')};
        let B = ${sample(`q + ${f(0.5 / (index === 1 ? 3 : tile.grid))}`, '2.1')};
        let inA = A.d > 0.0; let inB = B.d > 0.0;
        if (inA || inB) {
          cov += 0.25;
          bright += select(B.bright, A.bright, inA) * 0.25;
          cellR += select(B.cell, A.cell, inA) * 0.25;
        }
      }`;
    }).join('\n');
    return `if (tid == ${f(index)}) { ${samples} }`;
  });
  return `${fullscreen}\n${common}\n${shapes}
    @fragment fn leafFragment(in: LeafVertex) -> @location(0) vec4f {
      let st = vec2f(in.uv.x, 1.0 - in.uv.y);
      let tile = floor(st * 2.0);
      let tid = tile.x + tile.y * 2.0;
      let local = fract(st * 2.0);
      var cov = 0.0; var bright = 0.0; var cellR = 0.0;
      ${branches.join('\n')}
      let inv = 1.0 / max(cov, 1e-3);
      return vec4f(cov, bright * inv / 1.4, cellR * inv, 1.0);
    }`;
}

async function pipeline(device: GPUDevice, code: string) {
  const module = device.createShaderModule({ label: 'Tidewater leaf atlas', code });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((message) => message.type === 'error');
  if (errors.length) throw new Error(errors.map((message) => message.message).join('\n'));
  return device.createRenderPipelineAsync({
    label: 'Tidewater leaf atlas',
    layout: 'auto',
    vertex: { module, entryPoint: 'leafVertex' },
    fragment: { module, entryPoint: 'leafFragment', targets: [{ format: 'rgba8unorm' }] },
    primitive: { topology: 'triangle-list' },
  });
}

/** GPU-generated Tidewater LeafAtlas; caller owns and destroys the returned texture. */
export async function createLeafAtlas(device: GPUDevice): Promise<GPUTexture> {
  const texture = device.createTexture({
    label: 'Tidewater procedural leaf clusters',
    size: [SIZE, SIZE],
    mipLevelCount: LEVELS,
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  try {
    const bake = await pipeline(device, bakeShader());
    const mip = await pipeline(
      device,
      `${fullscreen}
      @group(0) @binding(0) var source: texture_2d<f32>;
      @group(0) @binding(1) var sourceSampler: sampler;
      @fragment fn leafFragment(in: LeafVertex) -> @location(0) vec4f {
        return textureSampleLevel(source, sourceSampler, in.uv, 0.0);
      }`,
    );
    const sampler = device.createSampler({ minFilter: 'linear', magFilter: 'linear' });
    const encoder = device.createCommandEncoder({ label: 'Tidewater leaf atlas bake' });
    for (let level = 0; level < LEVELS; level++) {
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: texture.createView({ baseMipLevel: level, mipLevelCount: 1 }),
            clearValue: [0, 0, 0, 0],
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });
      pass.setPipeline(level === 0 ? bake : mip);
      if (level > 0)
        pass.setBindGroup(
          0,
          device.createBindGroup({
            layout: mip.getBindGroupLayout(0),
            entries: [
              {
                binding: 0,
                resource: texture.createView({ baseMipLevel: level - 1, mipLevelCount: 1 }),
              },
              { binding: 1, resource: sampler },
            ],
          }),
        );
      pass.draw(3);
      pass.end();
    }
    device.queue.submit([encoder.finish()]);
    return texture;
  } catch (error) {
    texture.destroy();
    throw error;
  }
}
