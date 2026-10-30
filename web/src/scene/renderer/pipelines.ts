import shader from '@/scene/renderer/scene.wgsl?raw';
import skyShader from '@/scene/renderer/sky.wgsl?raw';
import surfaces from '@/scene/renderer/surfaces.wgsl?raw';

export async function createPipelines(device: GPUDevice, format: GPUTextureFormat) {
  const frameLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'depth' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'comparison' } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: {} },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ...[5, 6, 7, 9].map((binding) => ({
        binding,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { viewDimension: '2d-array' as const },
      })),
      { binding: 8, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    ],
  });
  const objectLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } }],
  });
  const shadowLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 5, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } },
      { binding: 8, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
    ],
  });
  const module = device.createShaderModule({
    label: 'Tidewater-style temple materials',
    code: shader + surfaces,
  });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === 'error');
  if (errors.length) throw new Error(errors.map((m) => m.message).join('\n'));
  const buffers: GPUVertexBufferLayout[] = [
    {
      arrayStride: 64,
      attributes: [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },
        { shaderLocation: 1, offset: 12, format: 'float32x3' },
        { shaderLocation: 2, offset: 24, format: 'float32x3' },
        { shaderLocation: 3, offset: 36, format: 'float32x4' },
        { shaderLocation: 4, offset: 52, format: 'float32x2' },
        { shaderLocation: 5, offset: 60, format: 'float32' },
      ],
    },
  ];
  const [main, shadow] = await Promise.all([
    device.createRenderPipelineAsync({
      label: 'Temple PBR',
      layout: device.createPipelineLayout({ bindGroupLayouts: [frameLayout, objectLayout] }),
      vertex: { module, entryPoint: 'vertex', buffers },
      fragment: { module, entryPoint: 'fragment', targets: [{ format }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
      multisample: { count: 4 },
    }),
    device.createRenderPipelineAsync({
      label: 'Temple shadow',
      layout: device.createPipelineLayout({ bindGroupLayouts: [shadowLayout, objectLayout] }),
      vertex: { module, entryPoint: 'shadowVertex', buffers },
      fragment: { module, entryPoint: 'shadowFragment', targets: [] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: {
        format: 'depth32float',
        depthWriteEnabled: true,
        depthCompare: 'less',
        depthBias: 2,
        depthBiasSlopeScale: 2,
      },
    }),
  ]);
  const skyModule = device.createShaderModule({ code: skyShader });
  const sky = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({ bindGroupLayouts: [frameLayout] }),
    vertex: { module: skyModule, entryPoint: 'vertex' },
    fragment: { module: skyModule, entryPoint: 'fragment', targets: [{ format }] },
    depthStencil: { format: 'depth24plus', depthWriteEnabled: false, depthCompare: 'always' },
    multisample: { count: 4 },
  });
  return { main, shadow, sky, frameLayout, objectLayout, shadowLayout };
}
