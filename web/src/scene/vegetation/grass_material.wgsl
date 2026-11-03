// Adapted from Tidewater GrassField (MIT), see docs/tidewater_license.txt.
const VEG_MEADOW_LUSH = vec3f(0.01532520, 0.03310477, 0.00393594);
const VEG_MEADOW_GREEN = vec3f(0.05087609, 0.08353513, 0.01002283);
const VEG_MEADOW_OLIVE = vec3f(0.10653922, 0.11280479, 0.01738910);
const VEG_MEADOW_YELLOW = vec3f(0.21404114, 0.17886750, 0.03310477);
const VEG_MEADOW_STRAW = vec3f(0.34239164, 0.25295008, 0.08898153);
const VEG_MEADOW_SOIL = vec3f(0.02451501, 0.01532520, 0.00719441);

struct VegMeadow { tone: vec3f, dry: f32, lush: f32 };
fn vegMeadowTone(mA: f32, mB: f32) -> VegMeadow {
  let m = mA * 0.55 + mB * 0.45;
  let olive = smoothstep(0.52, 0.6, m);
  let yellow = smoothstep(0.6, 0.67, m);
  let straw = smoothstep(0.66, 0.73, m + (mB - 0.5) * 0.2);
  let lush = smoothstep(0.46, 0.37, mB * 0.7 + mA * 0.3);
  var c = mix(VEG_MEADOW_GREEN, VEG_MEADOW_OLIVE, olive);
  c = mix(c, VEG_MEADOW_YELLOW, yellow * 0.8);
  c = mix(c, VEG_MEADOW_STRAW, straw * 0.55);
  c = mix(c, VEG_MEADOW_LUSH, lush * 0.75);
  return VegMeadow(c, olive * 0.4 + yellow * 0.6, lush);
}
fn vegGrassMaterial(metadata: vec3f, uv: vec2f, normal: vec3f,
  view: vec3f, heightFraction: f32, seed: f32) -> TidewaterSurface {
  let root = metadata.xy;
  let rnd = metadata.z;
  let hf = clamp(heightFraction, 0.0, 1.0);
  let mA = vegNoise(root * 0.035) * 0.5 + 0.25;
  let mB = vegNoise(root * 0.11 + vec2f(17.3, 4.9)) * 0.5 + 0.25;
  let meadow = vegMeadowTone(mA, mB);
  let dryBlade = select(0.0, 1.0, fract(rnd * 13.7 + seed * 3.1) < meadow.dry * 0.3 + 0.07);
  let ao = mix(0.32, 1.0, smoothstep(0.0, 0.75, hf));
  let tone = meadow.tone * (rnd * 0.34 + 0.83);
  let lushBase = mix(tone * 0.5, VEG_MEADOW_SOIL, 0.3);
  let tipDry = meadow.dry * 0.4 + smoothstep(0.8, 1.0, rnd) * 0.35;
  let lushTip = mix(tone * vec3f(1.25, 1.25, 1.05), VEG_MEADOW_STRAW,
    tipDry * smoothstep(0.55, 1.0, hf));
  var grass = mix(lushBase, lushTip, smoothstep(0.05, 0.95, hf));
  grass = mix(grass, mix(VEG_MEADOW_STRAW, VEG_MEADOW_SOIL * 1.8, rnd * 0.6)
    * (smoothstep(0.0, 0.5, hf) * 0.4 + 0.6), dryBlade);
  grass *= pow(max(1.0 - abs(uv.x), 0.0), 6.0) * smoothstep(0.05, 0.4, hf) * 0.18 + 1.0;
  // Match the slow shared wind clock: travelling waves reveal paler blade undersides.
  let windTime = frame.sun.w * 0.24;
  let drift = normalize(vec2f(0.35, 0.94)) * windTime * 3.95;
  let field = root - drift;
  let gust = smoothstep(0.38, 0.66, vegNoise(field / 35.0) * 0.62
    + vegNoise(field / 15.25 + 0.37) * 0.38);
  grass = mix(grass, grass * vec3f(1.3, 1.28, 1.1) + vec3f(0.03, 0.03, 0.015),
    gust * 0.42 * smoothstep(0.15, 0.9, hf) * 0.6);
  var result: TidewaterSurface;
  result.color = grass * ao;
  result.normal = normalize(normal + view * 0.4);
  result.rough = 0.8;
  result.ao = 1.0;
  result.coverage = 1.0;
  result.translucency = 0.3 * smoothstep(0.2, 1.0, hf);
  return result;
}
