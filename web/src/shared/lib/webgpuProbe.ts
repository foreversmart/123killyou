import type { HtmlCanvasSupport } from '@/shared/lib/htmlCanvas';

export async function probeWebGpuSupport(signal?: AbortSignal): Promise<HtmlCanvasSupport> {
  if (!navigator.gpu)
    return {
      supported: false,
      missing: ['navigator.gpu'],
      error: '浏览器未提供 WebGPU。请使用支持 WebGPU 的最新版 Chrome，并启用图形加速。',
    };
  let device: GPUDevice | undefined,
    texture: GPUTexture | undefined,
    readback: GPUBuffer | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  const check = async () => {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('未找到可用的 WebGPU 显卡。请在浏览器设置中开启图形加速。');
    const requested = await adapter.requestDevice();
    if (cancelled || signal?.aborted) {
      requested.destroy();
      throw new Error('检测已取消');
    }
    device = requested;
    device.pushErrorScope('validation');
    const shader = device.createShaderModule({
      code: '@vertex fn v(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f { var p = array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); return vec4f(p[i],0,1); } @fragment fn f() -> @location(0) vec4f { return vec4f(0.25,0.5,0.75,1); }',
    });
    const pipeline = await device.createRenderPipelineAsync({
      layout: 'auto',
      vertex: { module: shader, entryPoint: 'v' },
      fragment: { module: shader, entryPoint: 'f', targets: [{ format: 'rgba8unorm' }] },
    });
    if (cancelled || signal?.aborted) throw new Error('检测已取消');
    texture = device.createTexture({
      size: [1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    readback = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        { view: texture.createView(), clearValue: [0, 0, 0, 1], loadOp: 'clear', storeOp: 'store' },
      ],
    });
    pass.setPipeline(pipeline);
    pass.draw(3);
    pass.end();
    encoder.copyTextureToBuffer({ texture }, { buffer: readback, bytesPerRow: 256 }, [1, 1]);
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const pixel = new Uint8Array(readback.getMappedRange()).slice(0, 4);
    readback.unmap();
    const error = await device.popErrorScope();
    if (error) throw new Error(error.message);
    if (
      Math.abs(pixel[0] - 64) > 1 ||
      Math.abs(pixel[1] - 128) > 1 ||
      Math.abs(pixel[2] - 191) > 1 ||
      pixel[3] !== 255
    )
      throw new Error('WebGPU 实际绘制的像素未通过校验。');
    return { supported: true, missing: [] };
  };
  try {
    return await Promise.race([
      check(),
      new Promise<HtmlCanvasSupport>((_, reject) => {
        timer = setTimeout(() => {
          cancelled = true;
          reject(new Error('WebGPU 绘制检测超时，请检查图形加速后重新检测。'));
        }, 8000);
      }),
    ]);
  } catch (error) {
    return {
      supported: false,
      missing: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    cancelled = true;
    clearTimeout(timer);
    readback?.destroy();
    texture?.destroy();
    device?.destroy();
  }
}
