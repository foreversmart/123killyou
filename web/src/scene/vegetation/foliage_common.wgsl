// Adapted from Tidewater, Copyright (c) 2026 DRG Software Solutions LLC (MIT).
// Full license: docs/tidewater_license.txt.
fn vegHash12(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
fn vegNoise(p: vec2f) -> f32 {
  let i = floor(p); let fr = fract(p);
  let u = fr * fr * (fr * -2.0 + 3.0);
  let a = vegHash12(i); let b = vegHash12(i + vec2f(1.0, 0.0));
  let c = vegHash12(i + vec2f(0.0, 1.0));
  let d = vegHash12(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
fn vegSaturate(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn vegLuminance(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }
