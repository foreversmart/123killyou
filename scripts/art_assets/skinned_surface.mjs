import path from 'node:path';
import sharp from 'sharp';

export async function writeSkinnedSurface(manifest, gltf, output) {
  const material = gltf.json.materials[0] || {};
  const pbr = material.pbrMetallicRoughness || {};
  const albedo = gltf.texture(pbr.baseColorTexture?.index);
  if (!albedo) throw new Error('The supplied character has no base color texture.');
  const files = {
    albedo: 'linlan_model_albedo.webp',
    normal: 'linlan_model_normal.webp',
    arm: 'linlan_model_arm.webp',
  };
  await sharp(albedo)
    .resize(512, 512)
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(path.join(output, files.albedo));
  const normal = gltf.texture(material.normalTexture?.index);
  const arm = gltf.texture(pbr.metallicRoughnessTexture?.index);
  for (const [type, texture, background] of [
    ['normal', normal, { r: 128, g: 128, b: 255, alpha: 1 }],
    ['arm', arm, { r: 255, g: 224, b: 0, alpha: 1 }],
  ]) {
    const image = texture
      ? sharp(texture).resize(512, 512)
      : sharp({ create: { width: 512, height: 512, channels: 4, background } });
    await image
      .webp({ quality: type === 'normal' ? 95 : 90, alphaQuality: 100 })
      .toFile(path.join(output, files[type]));
  }
  const surface = { id: 'linlan_model', ...files };
  const existing = manifest.surfaces.findIndex((entry) => entry.id === surface.id);
  if (existing >= 0) manifest.surfaces[existing] = surface;
  else manifest.surfaces.push(surface);
  return existing >= 0 ? existing : manifest.surfaces.length - 1;
}
