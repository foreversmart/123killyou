@group(0) @binding(5) var surfaceColor: texture_2d_array<f32>;
@group(0) @binding(6) var surfaceNormal: texture_2d_array<f32>;
@group(0) @binding(7) var surfaceArm: texture_2d_array<f32>;
@group(0) @binding(8) var surfaceSampler: sampler;
@group(0) @binding(9) var environment: texture_2d_array<f32>;

fn surfaceSlot(pattern: f32) -> i32 {
  let p = i32(round(pattern));
  if (p >= 16) { return p - 16; }
  if (p == 1) { return 2; }
  if (p == 4) { return 1; }
  if (p == 7) { return 4; }
  if (p == 9) { return 3; }
  if (p == 10) { return 5; }
  return 0;
}
fn usesTexture(p: f32) -> bool {
  return p >= 16.0 || p == 1.0 || p == 4.0 || p == 7.0 || p == 8.0 || p == 9.0 || p == 10.0;
}
fn surfaceUv(i: Surface) -> vec2f {
  if (i.material.z >= 16.0) { return i.uv; }
  let n = abs(i.normal);
  var uv = i.local.xz;
  if (n.z > n.x && n.z > n.y) { uv = i.local.xy * vec2f(1,-1); }
  else if (n.x > n.y) { uv = i.local.zy * vec2f(1,-1); }
  return uv * select(0.55, 0.9, i.material.z == 1.0);
}
fn mappedNormal(n: vec3f, dx: vec3f, dy: vec3f, ux: vec2f, uy: vec2f, map: vec3f) -> vec3f {
  let det = ux.x * uy.y - ux.y * uy.x;
  let t = (dx * uy.y - dy * ux.y) * sign(det);
  let b = (-dx * uy.x + dy * ux.x) * sign(det);
  let length2 = max(max(dot(t,t), dot(b,b)), 0.00000001);
  return normalize((t * map.x + b * map.y) * inverseSqrt(length2) + n * map.z);
}
fn environmentUv(direction: vec3f) -> vec2f {
  let d = normalize(direction);
  return vec2f(atan2(d.z, d.x) / 6.2831853 + 0.5, acos(clamp(d.y,-1.0,1.0)) / 3.14159265);
}
fn environmentLight(direction: vec3f, rough: f32) -> vec3f {
  let layer = select(1, 0, frame.eye.w > 0.5);
  let color = textureSampleLevel(environment, surfaceSampler, environmentUv(direction), layer, rough * 8.0).rgb;
  return color * select(0.035, 0.8, frame.eye.w > 0.5);
}
// World-scale triplanar rock and forest floor keep steep mountains from
// stretching the ground texture. A second scale breaks the distant tiling.
fn terrainSurface(p: vec3f, n: vec3f, dx: vec3f, dy: vec3f) -> vec3f {
  let weights = pow(abs(n), vec3f(4.0));
  let w = weights / max(dot(weights, vec3f(1.0)), 0.0001);
  let scale = 0.22;
  let rockX = textureSampleGrad(surfaceColor, surfaceSampler, p.zy * scale, 1, dx.zy * scale, dy.zy * scale).rgb;
  let rockY = textureSampleGrad(surfaceColor, surfaceSampler, p.xz * scale, 1, dx.xz * scale, dy.xz * scale).rgb;
  let rockZ = textureSampleGrad(surfaceColor, surfaceSampler, p.xy * scale, 1, dx.xy * scale, dy.xy * scale).rgb;
  let floor = textureSampleGrad(surfaceColor, surfaceSampler, p.xz * 0.32, 3, dx.xz * 0.32, dy.xz * 0.32).rgb;
  let broad = textureSampleGrad(surfaceColor, surfaceSampler, p.xz * 0.039 + vec2f(0.31, 0.17), 3, dx.xz * 0.039, dy.xz * 0.039).rgb;
  let rock = rockX * w.x + rockY * w.y + rockZ * w.z;
  let vegetation = mix(floor, broad, 0.4) * vec3f(0.7, 1.0, 0.55);
  return mix(vegetation, rock * vec3f(0.72, 0.77, 0.72), 1.0 - smoothstep(0.48, 0.81, n.y));
}
@fragment fn shadowFragment(i: Surface) {
  let dx = dpdx(i.uv); let dy = dpdy(i.uv);
  if (i.material.z >= 16.0) {
    // Use the authored cutout for foliage shadows as well. Sampling a filtered
    // alpha mask lets transparent gutters become a solid pale card at distance.
    let alpha = textureSampleLevel(surfaceColor, surfaceSampler, i.uv, surfaceSlot(i.material.z), 0.0).a;
    if (alpha < 0.52) { discard; }
    if (i.material.z == 23.0 && (i.uv.x > 0.76 || (i.uv.x > 0.55 && i.uv.y > 0.73))) { discard; }
  }
}
