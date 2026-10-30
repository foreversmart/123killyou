import { mat4, vec3 } from 'wgpu-matrix';
import { createPipelines } from '@/scene/renderer/pipelines';
import { createAtlas } from '@/scene/renderer/atlas';
import { frameData } from '@/scene/renderer/frame';
import type { World, WorldNode, V3 } from '@/scene/world/types';
import { createResources } from '@/scene/renderer/resources';
import { createDraws, destroyDraws, type Draw } from '@/scene/renderer/draws';

type Pipelines = Awaited<ReturnType<typeof createPipelines>>;

// A scoped version of Tidewater's Engine/GPU frame loop: one command encoder,
// shadow pass then the material pass. Each scene owns its GPU resources.
export class TempleRenderer {
  private pipelines!: Pipelines;
  private draws = new Map<WorldNode, Draw>();
  private frame!: GPUBuffer;
  private frameGroup!: GPUBindGroup;
  private shadowGroup!: GPUBindGroup;
  private resources?: Awaited<ReturnType<typeof createResources>>;
  private shadow!: GPUTexture;
  private atlas!: GPUTexture;
  private depth?: GPUTexture;
  private color?: GPUTexture;
  private disposed = false;
  private width = 0;
  private height = 0;
  private constructor(
    private device: GPUDevice,
    private context: GPUCanvasContext,
    private canvas: HTMLCanvasElement,
    private format: GPUTextureFormat,
  ) {}

  static async create(canvas: HTMLCanvasElement, onError: (message: string) => void) {
    const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('WebGPU 无法连接显卡，请检查浏览器的图形加速设置。');
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) {
      device.destroy();
      throw new Error('无法创建 WebGPU 画布。');
    }
    const engine = new TempleRenderer(
      device,
      context,
      canvas,
      navigator.gpu.getPreferredCanvasFormat(),
    );
    device.lost.then((info) => {
      if (!engine.disposed) onError('3D 画面连接已中断：' + info.message + '。请重新载入游戏。');
    });
    device.addEventListener('uncapturederror', (event) => {
      if (!engine.disposed) onError('3D 绘制失败：' + event.error.message);
    });
    try {
      await engine.init();
      return engine;
    } catch (error) {
      engine.dispose();
      throw error;
    }
  }

  private async init() {
    const d = this.device;
    this.pipelines = await createPipelines(d, this.format);
    this.context.configure({ device: d, format: this.format, alphaMode: 'opaque' });
    this.frame = d.createBuffer({
      size: 528,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.shadow = d.createTexture({
      size: [2048, 2048],
      format: 'depth32float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.atlas = await createAtlas(d);
    this.resources = await createResources(d);
    this.shadowGroup = d.createBindGroup({
      layout: this.pipelines.shadowLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frame } },
        { binding: 5, resource: this.resources.albedo },
        { binding: 8, resource: this.resources.sampler },
      ],
    });
    this.frameGroup = d.createBindGroup({
      layout: this.pipelines.frameLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frame } },
        { binding: 1, resource: this.shadow.createView() },
        {
          binding: 2,
          resource: d.createSampler({
            compare: 'less-equal',
            magFilter: 'linear',
            minFilter: 'linear',
          }),
        },
        { binding: 3, resource: this.atlas.createView() },
        { binding: 4, resource: d.createSampler({ magFilter: 'linear', minFilter: 'linear' }) },
        { binding: 5, resource: this.resources.albedo },
        { binding: 6, resource: this.resources.normal },
        { binding: 7, resource: this.resources.arm },
        { binding: 8, resource: this.resources.sampler },
        { binding: 9, resource: this.resources.sky },
      ],
    });
  }

  setWorld(world: World) {
    this.clearWorld();
    this.draws = createDraws(
      this.device,
      world.root,
      this.resources!.meshes,
      this.pipelines.objectLayout,
    );
  }

  private resize() {
    const scale = Math.min(devicePixelRatio || 1, 1.7);
    const w = Math.max(1, Math.min(2400, Math.round(this.canvas.clientWidth * scale)));
    const h = Math.max(1, Math.min(1800, Math.round(this.canvas.clientHeight * scale)));
    if (w === this.width && h === this.height) return;
    this.width = this.canvas.width = w;
    this.height = this.canvas.height = h;
    this.depth?.destroy();
    this.color?.destroy();
    this.depth = this.device.createTexture({
      size: [w, h],
      format: 'depth24plus',
      sampleCount: 4,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.color = this.device.createTexture({
      size: [w, h],
      format: this.format,
      sampleCount: 4,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  render(world: World, time: number, delta: number, offset: V3) {
    this.resize();
    const d = this.device;
    const attachments = [
      ...world.hotspots,
      ...world.lighting.lamps,
      ...(world.lighting.contacts || []),
    ].filter((item) => item.anchor);
    const update = (n: WorldNode, parent: Float32Array) => {
      n.animate?.(time, delta);
      let m = mat4.translate(parent, n.position);
      m = mat4.rotateY(m, n.rotation[1]);
      m = mat4.rotateX(m, n.rotation[0]);
      m = mat4.rotateZ(m, n.rotation[2]);
      m = mat4.scale(m, n.scale);
      for (const item of attachments)
        if (item.anchor?.node === n)
          item.position = [...vec3.transformMat4(item.anchor.offset, m)] as V3;
      const draw = this.draws.get(n);
      if (draw) {
        const transforms = new Float32Array(40);
        transforms.set(m);
        transforms.set(mat4.transpose(mat4.inverse(m)), 16);
        transforms[32] = n.wind ?? 0;
        if (n.bend) transforms.set([...n.bend.pivot, n.bend.angle], 36);
        d.queue.writeBuffer(draw.uniform, 0, transforms);
      }
      n.children.forEach((child) => update(child, m));
    };
    update(world.root, mat4.identity());
    const { data, vp } = frameData(world.camera, world.lighting, this.width / this.height, offset);
    data[47] = time;
    d.queue.writeBuffer(this.frame, 0, data);
    const encoder = d.createCommandEncoder();
    const shadowPass = encoder.beginRenderPass({
      colorAttachments: [],
      depthStencilAttachment: {
        view: this.shadow.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });
    shadowPass.setPipeline(this.pipelines.shadow);
    shadowPass.setBindGroup(0, this.shadowGroup);
    this.draw(shadowPass, true);
    shadowPass.end();
    const sky = world.lighting.sky.map((c) => Math.pow(c * 0.55, 1 / 2.2));
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.color!.createView(),
          resolveTarget: this.context.getCurrentTexture().createView(),
          clearValue: { r: sky[0], g: sky[1], b: sky[2], a: 1 },
          loadOp: 'clear',
          storeOp: 'discard',
        },
      ],
      depthStencilAttachment: {
        view: this.depth!.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'discard',
      },
    });
    pass.setPipeline(this.pipelines.sky);
    pass.setBindGroup(0, this.frameGroup);
    pass.draw(3);
    pass.setPipeline(this.pipelines.main);
    pass.setBindGroup(0, this.frameGroup);
    this.draw(pass, false);
    pass.end();
    d.queue.submit([encoder.finish()]);
    return vp;
  }

  private draw(pass: GPURenderPassEncoder, shadows: boolean) {
    for (const draw of this.draws.values()) {
      if (shadows && draw.node.shadow === false) continue;
      pass.setBindGroup(1, draw.group);
      pass.setVertexBuffer(0, draw.vertex);
      pass.setIndexBuffer(draw.index, 'uint32');
      pass.drawIndexed(draw.count);
    }
  }

  private clearWorld() {
    destroyDraws(this.draws);
  }

  dispose() {
    this.disposed = true;
    this.clearWorld();
    this.depth?.destroy();
    this.color?.destroy();
    this.shadow?.destroy();
    this.atlas?.destroy();
    this.resources?.dispose();
    this.frame?.destroy();
    this.context.unconfigure();
    this.device.destroy();
  }
}
