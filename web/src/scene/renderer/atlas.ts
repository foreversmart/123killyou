export const labels = [
  '红烛寺',
  '明照寺',
  '听',
  '灯',
  '门',
  '纸',
  '登记簿',
  '大念处经',
  '明照旧事',
  '香客止步',
  '钟楼',
  '通行凭',
  '林岚',
  '周砚',
  '许栀',
  '赵熙',
  '红烛寺 · 客运',
  '只许去，不许问',
  '入住须知',
];
export const labelTile = (label: string) => labels.indexOf(label);

export async function createAtlas(device: GPUDevice) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e2d1a7';
  ctx.fillRect(0, 0, 2048, 2048);
  for (const [i, label] of labels.entries()) {
    const x = (i % 8) * 256,
      y = Math.floor(i / 8) * 256;
    ctx.fillStyle = i < 2 ? '#33332b' : '#d2bb8b';
    ctx.fillRect(x, y, 256, 256);
    ctx.strokeStyle = i < 2 ? '#b19b65' : '#7e6541';
    ctx.lineWidth = 5;
    ctx.strokeRect(x + 10, y + 10, 236, 236);
    ctx.fillStyle = i < 2 ? '#e1c995' : '#322f28';
    ctx.font =
      '600 ' +
      (label.length < 2 ? 144 : i < 2 ? 172 : label.length <= 4 ? 88 : 64) +
      'px "Songti SC", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 128, y + 132, 226);
  }
  const texture = device.createTexture({
    size: [2048, 2048],
    format: 'rgba8unorm-srgb',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture({ source: canvas }, { texture }, [2048, 2048]);
  return texture;
}
