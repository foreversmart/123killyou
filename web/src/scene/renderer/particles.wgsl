struct Frame {
  view: mat4x4f,
  shadow: mat4x4f,
  eye: vec4f,
  sky: vec4f,
  ground: vec4f,
  sun: vec4f,
  direction: vec4f,
  lamps: array<vec4f, 24>,
  inverseView: mat4x4f,
  contacts: array<vec4f, 8>,
};

@group(0) @binding(0) var<uniform> frame: Frame;

struct ParticleVertex {
  @builtin(position) clip: vec4f,
  @location(0) uv: vec2f,
  @location(1) alpha: f32,
  @location(2) color: vec3f,
};

fn hash3(seed: f32) -> vec3f {
  return fract(sin(vec3f(seed, seed + 17.13, seed + 43.71)) * vec3f(43758.5453, 22578.1459, 19642.349));
}

@vertex fn vertex(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> ParticleVertex {
  let id = f32(instanceIndex);
  let h = hash3(id * 0.7131 + 0.37);
  let h2 = hash3(id * 1.3917 + 5.1);
  let t = frame.sun.w;
  let phase = t * (0.08 + h2.x * 0.08) + id * 1.37;
  let drift = vec3f(
    sin(phase * 0.71 + h.x * 6.28) * 0.22,
    sin(phase * 0.93 + h.y * 5.21) * 0.12,
    cos(phase * 0.63 + h.z * 7.17) * 0.22,
  );
  let center = frame.eye.xyz + vec3f(
    (h.x - 0.5) * 10.0,
    (h.y - 0.5) * 4.6,
    (h.z - 0.5) * 8.0,
  ) + drift;

  // The inverse view-projection still provides stable camera axes after
  // normalization; its perspective scale only changes the sprite's aspect
  // slightly, which keeps the pass independent of a second camera uniform.
  let right = normalize(frame.inverseView[0].xyz);
  let up = normalize(frame.inverseView[1].xyz);
  let corners = array<vec2f, 4>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, 1.0),
  );
  let corner = corners[vertexIndex];
  let size = mix(0.012, 0.038, h2.y);
  let world = center + right * corner.x * size + up * corner.y * size;
  let toCamera = normalize(frame.eye.xyz - center);
  let sunDir = normalize(frame.direction.xyz);
  let forward = pow(max(dot(toCamera, sunDir), 0.0), 5.0);
  let day = select(0.0, 1.0, frame.eye.w > 0.5);
  let density = mix(0.018, 0.075, h2.z) * (0.35 + forward * 1.6) * day;
  let warm = mix(vec3f(0.78, 0.66, 0.49), vec3f(1.0, 0.72, 0.35), forward);

  var out: ParticleVertex;
  out.clip = frame.view * vec4f(world, 1.0);
  out.uv = corner;
  out.alpha = density;
  out.color = warm;
  return out;
}

@fragment fn fragment(in: ParticleVertex) -> @location(0) vec4f {
  let radius = length(in.uv);
  if (radius > 1.0) { discard; }
  let soft = 1.0 - smoothstep(0.42, 1.0, radius);
  let alpha = in.alpha * soft;
  if (alpha < 0.002) { discard; }
  // Premultiplied output pairs with the alpha blend state in pipelines.ts.
  return vec4f(in.color * alpha, alpha);
}
