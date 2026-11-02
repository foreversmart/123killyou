struct Frame {
  view: mat4x4f, shadow: mat4x4f, eye: vec4f, sky: vec4f,
  ground: vec4f, sun: vec4f, direction: vec4f, lamps: array<vec4f, 24>, inverseView: mat4x4f,
};
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(8) var skySampler: sampler;
@group(0) @binding(9) var skyTexture: texture_2d_array<f32>;
struct SkyVertex { @builtin(position) position: vec4f, @location(0) ray: vec3f };
@vertex fn vertex(@builtin(vertex_index) i: u32) -> SkyVertex {
  let positions = array<vec2f,3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
  var o: SkyVertex; o.position = vec4f(positions[i],0.99999,1);
  let world = frame.inverseView * vec4f(positions[i],1,1);
  o.ray = world.xyz / world.w - frame.eye.xyz;
  return o;
}
@fragment fn fragment(i: SkyVertex) -> @location(0) vec4f {
  let d = normalize(i.ray);
  let uv = vec2f(atan2(d.z,d.x) / 6.2831853 + 0.5, acos(clamp(d.y,-1.0,1.0)) / 3.14159265);
  let day = frame.eye.w > 0.5;
  let panorama = textureSampleLevel(skyTexture, skySampler, uv, select(1,0,day),0).rgb;
  let horizon = smoothstep(0.02,0.18,d.y);
  var color = mix(frame.sky.rgb * 0.75, panorama * select(0.12,0.78,day), horizon);

  // Late-afternoon atmospheric scattering: the sun is low enough to warm the
  // horizon while the upper sky keeps Tidewater's muted blue-grey fill. The
  // glow is directional, so it reads as a real sun rather than a flat overlay.
  let sunDir = normalize(frame.direction.xyz);
  let sunH = normalize(vec3f(sunDir.x, 0.0, sunDir.z));
  let viewH = normalize(vec3f(d.x, 0.0, d.z));
  let towardSun = max(dot(viewH, sunH), 0.0);
  let sunsetBand = (1.0 - smoothstep(-0.12, 0.34, d.y)) * (1.0 - smoothstep(0.2, 0.75, sunDir.y));
  let horizonGlow = pow(towardSun, 5.0) * sunsetBand;
  color += vec3f(0.18, 0.045, 0.008) * horizonGlow * select(0.0, 1.0, day);

  // A small, soft solar disc anchors the direction of the key light in wide
  // exterior shots without competing with the authored environment panorama.
  let disc = smoothstep(0.9996, 0.99996, dot(d, sunDir)) * smoothstep(-0.08, 0.12, sunDir.y);
  color += vec3f(1.0, 0.32, 0.07) * disc * select(0.0, 1.6, day);
  return vec4f(pow(max(color,vec3f(0)),vec3f(1.0/2.2)),1);
}
