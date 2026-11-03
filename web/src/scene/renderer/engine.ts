import { mat4, vec3 } from 'wgpu-matrix';
import { createPipelines } from '@/scene/renderer/pipelines';
import { createAtlas } from '@/scene/renderer/atlas';
import { frameData, SHADOW_MAP_SIZE } from '@/scene/renderer/frame';
import type { World, WorldNode, V3 } from '@/scene/world/types';
import { createResources } from '@/scene/renderer/resources';
import { createDraws, destroyDraws, type Draw } from '@/scene/renderer/draws';
import {
  applyBlenderPose,
  blenderClipFor,
  type BlenderAnimationLibrary,
} from '@/scene/world_character/blender_action_library';
import { batchVegetation } from '@/scene/vegetation/batches';
import { createSkinPose } from '@/scene/world_character/skin_pose';

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
      size: 800,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.shadow = d.createTexture({
      size: [SHADOW_MAP_SIZE, SHADOW_MAP_SIZE],
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
        { binding: 10, resource: this.resources.vegetation },
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
        { binding: 10, resource: this.resources.vegetation },
        { binding: 9, resource: this.resources.sky },
      ],
    });
  }

  setWorld(world: World) {
    this.clearWorld();
    batchVegetation(world.root, this.resources!.meshes);
    this.enableBlenderAnimations(world.root, this.resources?.animations);
    this.draws = createDraws(
      this.device,
      world.root,
      this.resources!.meshes,
      this.pipelines.objectLayout,
    );
  }

  private enableBlenderAnimations(node: WorldNode, library?: BlenderAnimationLibrary) {
    node.blenderEnabled = Boolean(
      node.blenderAction && blenderClipFor(node.blenderAction, library),
    );
    if (node.skinTargets) {
      const geometry = this.resources?.meshes.get(node.skinTargets.mesh.asset!);
      if (!geometry?.skin) throw new Error('角色骨骼数据未加载，请重新载入。');
      node.updateSkin = createSkinPose(node.skinTargets, geometry.skin.skeleton, geometry);
      node.updateSkin();
    }
    node.children.forEach((child) => this.enableBlenderAnimations(child, library));
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
    const update = (n: WorldNode, parent: Float32Array, inheritedGhost = 0) => {
      n.animate?.(time, delta);
      if (n.blenderEnabled && n.blenderAction && n.blenderTargets && this.resources?.animations)
        applyBlenderPose(n.blenderAction, time, this.resources.animations, n.blenderTargets);
      n.updateSkin?.();
      let m: Float32Array;
      if (n.matrix) m = mat4.multiply(parent, n.matrix);
      else {
        m = mat4.translate(parent, n.position);
        m = mat4.rotateY(m, n.rotation[1]);
        m = mat4.rotateX(m, n.rotation[0]);
        m = mat4.rotateZ(m, n.rotation[2]);
        m = mat4.scale(m, n.scale);
      }
      for (const item of attachments)
        if (item.anchor?.node === n)
          item.position = [...vec3.transformMat4(item.anchor.offset, m)] as V3;
      const draw = this.draws.get(n);
      const ghost = Math.max(inheritedGhost, n.ghost || 0);
      if (draw) {
        const transforms = new Float32Array(40);
        transforms.set(m);
        transforms.set(mat4.transpose(mat4.inverse(m)), 16);
        transforms[32] = n.wind ?? 0;
        transforms[33] = n.receiveShadow === false || ghost > 0 ? 0 : 1;
        transforms[34] = n.skinMatrices ? 1 : 0;
        transforms[35] = ghost;
        if (n.bend) transforms.set([...n.bend.pivot, n.bend.angle], 36);
        d.queue.writeBuffer(draw.uniform, 0, transforms);
        if (draw.bones && n.skinMatrices) d.queue.writeBuffer(draw.bones, 0, n.skinMatrices);
      }
      n.children.forEach((child) => update(child, m, ghost));
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
    // Camera-relative dust plus the road's broad low mist catch the low sun.
    // Both stay depth-tested against the scene, so they read as air in the
    // world rather than a screen-space overlay.
    pass.setPipeline(this.pipelines.particles);
    pass.setBindGroup(0, this.frameGroup);
    pass.draw(4, world.lighting.atmosphere[0] > 0 ? 288 : 160);
    pass.end();
    d.queue.submit([encoder.finish()]);
    return vp;
  }

  private draw(pass: GPURenderPassEncoder, shadows: boolean) {
    for (const draw of this.draws.values()) {
      if (draw.node.shadowOnly && !shadows) continue;
      if (shadows && (draw.node.shadow === false || (draw.node.ghost || 0) > 0)) continue;
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
