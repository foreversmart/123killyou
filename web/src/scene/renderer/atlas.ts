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
  '大殿侧门',
  '偏殿回廊',
  '天王殿',
  '鼓楼',
  '伽蓝殿',
  '大雄宝殿',
  '祖师殿',
  '客寮院',
  '客堂',
  '斋堂',
  '僧寮',
  '藏经楼',
  '方丈院',
  '香积厨/库房',
  '净房',
];
const plaqueLabels = [
  '红烛寺',
  '红烛寺 · 客运',
  '明照寺',
  '听',
  '灯',
  '门',
  '纸',
  '入住须知',
  '香客止步',
  '大殿侧门',
  '偏殿回廊',
  '天王殿',
  '钟楼',
  '鼓楼',
  '伽蓝殿',
  '大雄宝殿',
  '祖师殿',
  '客寮院',
  '客堂',
  '斋堂',
  '僧寮',
  '藏经楼',
  '方丈院',
  '香积厨/库房',
  '净房',
];
export const labelTile = (label: string) => labels.indexOf(label);
export const plaqueLabelTile = (label: string) => {
  const index = plaqueLabels.indexOf(label);
  return index < 0 ? labelTile(label) : labels.length + index;
};

export async function createAtlas(device: GPUDevice) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e2d1a7';
  ctx.fillRect(0, 0, 2048, 2048);
  for (const [i, label] of [...labels, ...plaqueLabels].entries()) {
    const x = (i % 8) * 256,
      y = Math.floor(i / 8) * 256;
    const plaque = i >= labels.length;
    // The four guest-room plaques are old timber tags. Keep their glyphs
    // readable at close range without the fresh paper-sign contrast.
    const roomPlaque = !plaque && i >= 2 && i <= 5;
    ctx.fillStyle = plaque ? '#5b2934' : i < 2 ? '#33332b' : roomPlaque ? '#5c5545' : '#d2bb8b';
    ctx.fillRect(x, y, 256, 256);
    ctx.strokeStyle = plaque ? '#d0a85c' : i < 2 ? '#b19b65' : roomPlaque ? '#827255' : '#7e6541';
    ctx.lineWidth = 5;
    ctx.strokeRect(x + 10, y + 10, 236, 236);
    ctx.fillStyle = plaque ? '#f0ca76' : i < 2 ? '#e1c995' : roomPlaque ? '#c1ae7d' : '#322f28';
    ctx.font =
      '600 ' +
      (label.length < 2 ? 144 : !plaque && i < 2 ? 172 : label.length <= 4 ? 88 : 64) +
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
