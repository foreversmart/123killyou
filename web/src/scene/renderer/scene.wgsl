struct Frame {
  view: mat4x4f,
  shadow: mat4x4f,
  eye: vec4f,
  sky: vec4f,
  ground: vec4f,
  sun: vec4f,
  direction: vec4f,
  lamps: array<vec4f, 8>,
  inverseView: mat4x4f,
  contacts: array<vec4f, 8>,
};
struct Object { model: mat4x4f, normal: mat4x4f, effects: vec4f, joint: vec4f };
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var shadowSampler: sampler_comparison;
@group(0) @binding(3) var atlas: texture_2d<f32>;
@group(0) @binding(4) var atlasSampler: sampler;
@group(1) @binding(0) var<uniform> object: Object;
struct Vertex {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) color: vec3f,
  @location(3) material: vec4f,
  @location(4) uv: vec2f,
  @location(5) tile: f32,
};
struct Surface {
  @builtin(position) clip: vec4f,
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) color: vec3f,
  @location(3) material: vec4f,
  @location(4) uv: vec2f,
  @location(5) local: vec3f,
  @location(6) @interpolate(flat) tile: i32,
};
fn rotateJoint(p: vec3f, angle: f32) -> vec3f {
  let c = cos(angle); let s = sin(angle);
  return vec3f(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}
fn surface(v: Vertex) -> Surface {
  var o: Surface;
  // A two-bone blend deforms the intact elbow/knee mesh. Attachments use the
  // same pivot on the CPU, so sleeves, hands, utensils and their shadows agree.
  let weight = 1.0 - smoothstep(object.joint.y - 0.055, object.joint.y + 0.055, v.position.y);
  let local = mix(v.position, object.joint.xyz + rotateJoint(v.position - object.joint.xyz, object.joint.w), weight);
  let normal = mix(v.normal, rotateJoint(v.normal, object.joint.w), weight);
  var p = object.model * vec4f(local, 1.0);
  if (object.effects.x > 0.0) {
    let heightMask = select(smoothstep(0.0, 2.8, v.position.y), v.uv.y, v.material.z == 11.0);
    let sway = sin(frame.sun.w * 1.3 + p.x * 0.7 + p.z * 0.3) * 0.035 * heightMask * heightMask * object.effects.x;
    p.x += sway; p.z += sway * 0.4;
  }
  o.clip = frame.view * p; o.position = p.xyz;
  o.normal = normalize((object.normal * vec4f(normal, 0.0)).xyz);
  o.color = v.color; o.material = v.material; o.uv = v.uv;
  o.local = v.position; o.tile = i32(v.tile);
  return o;
}
@vertex fn vertex(v: Vertex) -> Surface { return surface(v); }
@vertex fn shadowVertex(v: Vertex) -> Surface {
  var result = surface(v);
  result.clip = frame.shadow * vec4f(result.position, 1.0);
  return result;
}

// Adapted from Tidewater GameMaterials: procedural material in rest coordinates,
// so grain and weave follow moving props and limbs rather than sliding over them.
fn hash(p: vec3f) -> f32 { return fract(sin(dot(p, vec3f(127.1, 311.7, 74.7))) * 43758.5453); }
fn noise(p: vec3f) -> f32 {
  let i = floor(p); let f = fract(p); let u = f * f * (3.0 - 2.0 * f);
  let a = mix(mix(hash(i), hash(i + vec3f(1,0,0)), u.x), mix(hash(i + vec3f(0,1,0)), hash(i + vec3f(1,1,0)), u.x), u.y);
  let b = mix(mix(hash(i + vec3f(0,0,1)), hash(i + vec3f(1,0,1)), u.x), mix(hash(i + vec3f(0,1,1)), hash(i + vec3f(1,1,1)), u.x), u.y);
  return mix(a, b, u.z);
}
fn fbm(p: vec3f) -> f32 { return noise(p) * 0.55 + noise(p * 2.13 + 7.1) * 0.3 + noise(p * 4.7 + 3.3) * 0.15; }
fn shadeShadow(p: vec3f, n: vec3f) -> f32 {
  let sc = frame.shadow * vec4f(p + n * 0.003, 1);
  let uv = sc.xy / sc.w * vec2f(0.5, -0.5) + 0.5;
  let z = sc.z / sc.w - 0.00015;
  var sum = 0.0;
  for (var x = -1; x <= 1; x++) { for (var y = -1; y <= 1; y++) {
    sum += textureSampleCompareLevel(shadowMap, shadowSampler, uv + vec2f(f32(x), f32(y)) / 2048.0, z);
  }}
  return select(sum / 9.0, 1.0, any(uv < vec2f(0)) || any(uv > vec2f(1)) || z > 1.0);
}
// GGX + Lambert, the same roughness/metalness model as Tidewater's scene lighting.
fn brdf(n: vec3f, v: vec3f, l: vec3f, albedo: vec3f, rough: f32, metal: f32) -> vec3f {
  let h = normalize(l + v); let nl = max(dot(n,l), 0.0); let nv = max(dot(n,v), 0.001);
  let nh = max(dot(n,h), 0.0); let vh = max(dot(v,h), 0.0);
  let a = max(rough * rough, 0.025); let a2 = a * a;
  let d = a2 / max(3.14159 * pow(nh * nh * (a2 - 1.0) + 1.0, 2.0), 0.0001);
  let k = pow(rough + 1.0, 2.0) / 8.0;
  let g = (nv / (nv * (1.0 - k) + k)) * (nl / (nl * (1.0 - k) + k));
  let f0 = mix(vec3f(0.04), albedo, metal); let f = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
  return (albedo * (1.0 - metal) / 3.14159 + f * d * g / max(4.0 * nv * nl, 0.001)) * nl;
}
fn film(color: vec3f) -> vec3f {
  let x = color * frame.ground.w;
  let mapped = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0), vec3f(1));
  return pow(mapped, vec3f(1.0 / 2.2));
}
// Local ambient occlusion under each foot complements the directional shadow
// indoors. The anchors follow the knee rig and fade when a foot leaves the floor.
fn contactVisibility(p: vec3f, n: vec3f) -> f32 {
  var occlusion = 0.0;
  for (var j = 0; j < 8; j++) {
    let foot = frame.contacts[j];
    let d = p - foot.xyz;
    let height = 1.0 - smoothstep(0.015, 0.18, abs(d.y));
    let radial = exp(-dot(d.xz, d.xz) / max(foot.w * foot.w, 0.0001));
    occlusion += select(0.0, radial * height * 0.72, foot.w > 0.0);
  }
  return 1.0 - min(0.78, occlusion) * smoothstep(0.3, 0.85, n.y);
}
@fragment fn fragment(i: Surface, @builtin(front_facing) front: bool) -> @location(0) vec4f {
  let p = i.local; var col = i.color; let pat = i.material.z;
  var rough = i.material.x; var metal = i.material.y;
  var n = normalize(i.normal) * select(-1.0, 1.0, front);
  let uv = surfaceUv(i); let ux = dpdx(uv); let uy = dpdy(uv);
  let dx = dpdx(i.position); let dy = dpdy(i.position);
  var occlusion = 1.0;
  if (pat > 0.5 && pat < 1.5) {
    let grain = fbm(p * vec3f(35.0, 1.8, 35.0));
    let crack = smoothstep(0.66, 0.76, noise(p * vec3f(90, 3, 90)));
    col *= mix(0.65, 1.18, grain) * (1.0 - crack * 0.35);
  } else if (pat < 2.5 && pat > 1.5) {
    let weave = sin(p.x * 850.0) * sin((p.y + p.z) * 850.0);
    let detailFade = 1.0 - smoothstep(0.0005, 0.002, length(dx) + length(dy));
    col *= mix(0.92, 1.04, fbm(p * 8.0)) * (1.0 + weave * 0.018 * detailFade);
  } else if (pat < 3.5 && pat > 2.5) {
    col *= mix(0.92, 1.07, fbm(p * 25.0));
  } else if (pat < 4.5 && pat > 3.5) {
    col *= mix(0.64, 1.14, fbm(p * 9.0));
  } else if (pat < 5.5 && pat > 4.5) {
    col = mix(col, vec3f(0.035, 0.10, 0.075), smoothstep(0.6, 0.85, fbm(p * 16.0)));
  } else if (pat > 6.5 && pat < 16.0) {
    col *= mix(0.72, 1.08, fbm(p * 16.0));
  }
  if (usesTexture(pat)) {
    let slot = surfaceSlot(pat);
    let sample = textureSampleGrad(surfaceColor, surfaceSampler, uv, slot, ux, uy);
    if (pat >= 16.0 && sample.a < 0.42) { discard; }
    let arm = textureSampleGrad(surfaceArm, surfaceSampler, uv, slot, ux, uy).rgb;
    let detail = textureSampleGrad(surfaceNormal, surfaceSampler, uv, slot, ux, uy).xyz * 2.0 - 1.0;
    n = mappedNormal(n, dx, dy, ux, uy, detail * vec3f(0.65,0.65,1));
    col = select(mix(col, sample.rgb * (0.55 + col * 1.8), 0.72), col * sample.rgb, pat >= 8.0);
    rough = clamp(rough * arm.g, 0.19, 1.0);
    metal *= arm.b;
    occlusion = mix(0.55, 1.0, arm.r);
  }
  if (i.tile >= 0) {
    let cell = vec2f(f32(i.tile % 8), f32(i.tile / 8));
    let uv = (cell + clamp(i.uv, vec2f(0.002), vec2f(0.998))) / 8.0;
    col *= textureSampleLevel(atlas, atlasSampler, uv, 0.0).rgb;
  }
  let v = normalize(frame.eye.xyz - i.position);
  let ambient = mix(frame.ground.rgb, frame.sky.rgb, n.y * 0.5 + 0.5);
  var lit = col * ambient * (1.0 - metal * 0.55) * occlusion;
  lit *= contactVisibility(i.position, n);
  if (pat == 11.0) {
    lit += col * frame.sun.rgb * pow(max(0.0,dot(-n, normalize(frame.direction.xyz))),2.0) * 0.16;
  }
  let fresnel = mix(vec3f(0.04), col, metal);
  lit += environmentLight(reflect(-v, n), rough) * fresnel * occlusion * (1.0 - rough * 0.45);
  if (pat == 3.0) {
    lit += col * vec3f(0.1,0.036,0.018) * pow(max(0.0,dot(-n,normalize(frame.direction.xyz))),2.0);
  }
  lit += brdf(n, v, normalize(frame.direction.xyz), col, rough, metal) * frame.sun.rgb * shadeShadow(i.position, n);
  for (var j = 0; j < 4; j++) {
    let source = frame.lamps[j * 2]; let color = frame.lamps[j * 2 + 1];
    let d = source.xyz - i.position; let distance = max(dot(d, d), 0.05);
    lit += brdf(n, v, normalize(d), col, rough, metal) * color.rgb * source.w / (1.0 + distance);
  }
  lit += col * i.material.w;
  let fog = 1.0 - exp(-distance(frame.eye.xyz, i.position) * frame.sky.w);
  lit = mix(lit, frame.sky.rgb * 0.7, fog);
  return vec4f(film(lit), 1);
}
