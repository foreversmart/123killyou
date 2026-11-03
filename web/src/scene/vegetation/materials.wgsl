// Entry points use original aMat.yzw as metadata and an instance-stable seed.
// Invoke from uniform fragment flow: derivatives serve both opaque and leaf branches.
fn tidewaterMask(pattern: f32, metadata: vec3f, uv: vec2f, pos: vec3f,
  normal: vec3f, view: vec3f, seed: f32) -> f32 {
  let dx = dpdx(uv); let dy = dpdy(uv);
  let width = fwidth(uv);
  let lod = clamp(log2(max(max(width.x, width.y) * 512.0, 1e-4)), 0.0, 8.0);
  let geometric = cross(dpdx(pos), dpdy(pos));
  let faceNormal = geometric / max(length(geometric), 1e-6);
  let facing = abs(dot(faceNormal, view));
  let part = pattern - 100.0;
  if (pattern >= 100.0 && pattern < 120.0) {
    let leaf = vegLeafSample(uv, vegLeafTile(seed, part > 2.5), dx, dy);
    return vegCanopyCoverage(part, leaf, lod, facing);
  }
  if (pattern >= 120.0 && pattern < 140.0) {
    return vegPlantMask(pattern - 120.0, metadata, uv, width.x, seed);
  }
  return 1.0;
}
fn tidewaterMaterial(pattern: f32, metadata: vec3f, uv: vec2f, pos: vec3f,
  normal: vec3f, view: vec3f, heightFraction: f32, seed: f32) -> TidewaterSurface {
  let dx = dpdx(uv); let dy = dpdy(uv);
  let width = fwidth(uv);
  let lod = clamp(log2(max(max(width.x, width.y) * 512.0, 1e-4)), 0.0, 8.0);
  let geometric = cross(dpdx(pos), dpdy(pos));
  let faceNormal = geometric / max(length(geometric), 1e-6);
  let facing = abs(dot(faceNormal, view));
  if (pattern < 100.0) {
    return TidewaterSurface(vec3f(1.0), normal, 1.0, 1.0, 1.0, 0.0);
  }
  let canopyPart = pattern - 100.0;
  if (pattern >= 100.0 && pattern < 120.0) {
    let leaf = vegLeafSample(uv, vegLeafTile(seed, canopyPart > 2.5), dx, dy);
    let coverage = vegCanopyCoverage(canopyPart, leaf, lod, facing);
    return vegCanopyMaterial(canopyPart, metadata, uv, normal, view,
      heightFraction, seed, leaf, coverage);
  }
  if (pattern >= 140.0) {
    return vegGrassMaterial(metadata, uv, normal, view, heightFraction, seed);
  }
  let part = pattern - 120.0;
  let age = metadata.x;
  let stem = part < 0.5;
  let nut = part > 4.5 && part < 5.5;
  let broad = part > 5.5;
  let isLeaf = !stem && !nut;
  var result: TidewaterSurface;
  result.color = vegPlantAlbedo(part, metadata, uv, heightFraction, seed);
  result.normal = normalize(normal + view * select(0.0, 0.15, isLeaf));
  let broadR = select(select(select(0.45, 0.42, part > 7.5),
    0.58, part > 6.5 && part < 7.5), 0.46, part < 6.5);
  result.rough = select(select(select(0.7, 0.62, part < 1.5 || nut), 0.92, stem),
    mix(broadR, 0.85, smoothstep(0.9, 0.98, age)), broad);
  result.ao = 1.0;
  result.coverage = vegPlantMask(part, metadata, uv, width.x, seed);
  result.translucency = select(0.0, select(0.3, 0.2, broad), isLeaf);
  return result;
}
