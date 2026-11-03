// Original Tidewater canopy / frond response on a shared, slowed vegetation clock.
// The stored per-plant roots keep every trunk and grass clump attached to its terrain.
fn tidewaterWind(p: vec3f, n: vec3f, root: vec4f, veg: vec4f, pattern: f32, phase: f32) -> vec3f {
  let time = frame.sun.w * 0.24;
  let direction = normalize(vec3f(0.35, 0.0, 0.94));
  let perpendicular = vec3f(-direction.z, 0.0, direction.x);
  let field = root.xz - direction.xz * time * 3.95;
  let gust = smoothstep(0.38, 0.66, vegNoise(field / 35.0) * 0.62 + vegNoise(field / 15.25 + 0.37) * 0.38);
  let strength = 0.35;
  let ph0 = root.w * 6.2832;
  let height = max(0.0, p.y - root.y);
  let hf = max(0.0, veg.x);
  let rooted = smoothstep(0.0, 0.08, height);
  if (pattern == 140.0) {
    let bend = strength * (gust * 0.55 + 0.22) + sin(time * 1.9 + ph0 + root.x * 0.2) * strength * 0.1;
    let flutter = sin(time * 7.3 + ph0 * 3.0 + phase * 20.0) * (strength * 0.06 + 0.015);
    let offset = p - root.xyz;
    let displacement = (direction * bend + perpendicular * flutter) * hf * hf * length(offset);
    return root.xyz + normalize(offset + displacement + vec3f(0.0, 1e-6, 0.0)) * length(offset);
  }
  if (pattern < 120.0) {
    let flex = veg.y;
    let scale = select(1.0, 0.65, pattern >= 104.0);
    let nominalHeight = select(12.5, 1.6, pattern >= 104.0);
    let sway = (strength * strength * 0.009 * (gust * 0.8 + 0.3)
      + sin(time * 0.9 + ph0) * strength * 0.0045 * (gust + 0.4)) * nominalHeight * hf * hf;
    let cross = sin(time * 0.67 + ph0 * 1.3) * strength * 0.002 * nominalHeight * hf * hf;
    let branch = sin(time * (phase + 1.7) + phase * 20.0 + ph0) * flex * strength * scale * 0.07 * (gust + 0.5)
      - flex * strength * strength * scale * 0.04 * (gust + 0.3);
    let flutter = sin(time * 9.5 + phase * 50.0 + p.x * 1.9 + p.z * 2.3) * veg.w * scale * (strength * 0.035 + 0.005);
    return p + (direction * sway + perpendicular * cross + vec3f(0.0, branch, 0.0) + n * flutter) * rooted;
  }
  let s2 = veg.y * veg.y;
  let sway = strength * strength * 0.014 * (gust * 0.9 + 0.3)
    + sin(time * 0.83 + ph0) * strength * 0.0065 * (gust + 0.45);
  let cross = sin(time * 0.61 + ph0 * 1.7) * strength * 0.0028;
  let bend = s2 * 4.5 * (strength * strength * 0.16 * (gust * 0.8 + 0.35)
    + sin(time * (phase * 0.5 + 1.3) + phase * 23.0 + ph0) * strength * 0.075 * (gust + 0.3));
  let bounce = sin(time * (phase + 2.1) + phase * 41.0) * s2 * strength * 0.1;
  let flutter = veg.w * sin(time * (phase * 5.0 + 11.0) + phase * 60.0 + veg.y * 9.0) * (strength * 0.045 + 0.008);
  return p + ((direction * sway + perpendicular * cross) * height * hf
    + direction * bend + vec3f(0.0, bounce - bend * 0.3, 0.0) + n * flutter) * rooted;
}
