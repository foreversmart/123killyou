// Adapted from Tidewater, Copyright (c) 2026 DRG Software Solutions LLC (MIT).
// Full license: docs/tidewater_license.txt.
@group(0) @binding(10) var vegetationAtlas: texture_2d<f32>;
struct TidewaterSurface {
  color: vec3f, normal: vec3f, rough: f32, ao: f32,
  coverage: f32, translucency: f32,
};
fn vegLeafSample(st: vec2f, tile: f32, dx: vec2f, dy: vec2f) -> vec4f {
  let tuv = (vec2f(fract(tile * 0.5) * 2.0, floor(tile * 0.5))
    + clamp(st, vec2f(0.004), vec2f(0.996))) * 0.5;
  return textureSampleGrad(vegetationAtlas, surfaceSampler, vec2f(tuv.x, 1.0 - tuv.y),
    dx * vec2f(0.5, -0.5), dy * vec2f(0.5, -0.5));
}
fn vegCanopyCoverage(part: f32, leaf: vec4f, lod: f32, facing: f32) -> f32 {
  let threshold = mix(0.5, 0.3, vegSaturate((lod - 1.0) / 4.0))
    + (1.0 - smoothstep(0.08, 0.35, facing)) * 0.45;
  // The original canopy uses a binary cutout. Its covered pixels stay opaque;
  // MSAA must not thin the already filtered leaf edge a second time.
  return select(0.0, 1.0, leaf.x > threshold || part < 0.5 || part > 4.5);
}
fn vegCanopyMaterial(part: f32, metadata: vec3f, uv: vec2f, normal: vec3f,
  view: vec3f, hf: f32, seed: f32, leaf: vec4f, coverage: f32) -> TidewaterSurface {
  let ao = metadata.x; let cr = metadata.y;
  let bark = part < 0.5 || part > 4.5;
  let shrub = part > 2.5;
  let treeSpecies = vegTreeSpecies(seed); let species = vegShrubSpecies(seed);
  let bright = leaf.y * 1.4; let cell = leaf.z;
  var c = vegCanopyLeafColor(seed, cr, shrub) * bright;
  c = mix(c, vec3f(0.19462, 0.04231, 0.01599), smoothstep(0.86, 0.98, cell)
    * 0.55 * select(0.0, 1.0, shrub && species < 0.5));
  let varied = select(vec3f(0.19462, 0.04231, 0.01599),
    vec3f(0.32314, 0.25415, 0.02956), fract(cell * 7.3) > 0.5);
  c = mix(c, varied, smoothstep(0.72, 0.9, cell) * 0.55
    * select(0.0, 1.0, shrub && species == 1.0));
  c = select(c, vec3f(0.45078, 0.01938, 0.01298), shrub && species > 1.5 && cell > 0.92);
  c = mix(c, mix(vec3f(0.25415, 0.19462, 0.04231), vec3f(0.20864, 0.04817, 0.01599),
    step(0.992, fract(cell * 3.7))), step(0.984, fract(cell * 3.7)) * select(0.6, 0.0, shrub));
  let outer = smoothstep(0.62, 1.0, ao);
  c = mix(c, c * vec3f(1.16, 1.22, 0.92), outer * 0.7) * mix(0.55, 1.0, ao);
  if (bark) {
    let n2 = vegNoise(vec2f(uv.x * 6.0, uv.y * 0.7));
    c = vegBarkColor(vegNoise(vec2f(uv.x * 30.0, uv.y * 2.5 + seed * 40.0)), n2);
    c = mix(c, mix(vec3f(0.02519, 0.04231, 0.00913), vec3f(0.05781, 0.09084, 0.02315), n2),
      smoothstep(0.45, 0.7, vegNoise(vec2f(uv.x * 9.0, uv.y * 1.3 + seed * 11.0))
      + (0.35 - hf) * 0.6) * 0.7);
  }
  var result: TidewaterSurface;
  result.color = c;
  result.ao = select(mix(0.35, 1.0, ao), smoothstep(0.0, 0.75, hf) * 0.45 + 0.4, bark);
  result.rough = select(select(0.82, 0.65,
    (shrub && species < 0.5) || (!shrub && treeSpecies < 0.5)), 0.92, bark);
  result.normal = select(normalize(normal + view * 0.7), normal, bark);
  result.coverage = coverage;
  result.translucency = select(0.5 * (ao * 0.6 + 0.4), 0.0, bark);
  return result;
}
