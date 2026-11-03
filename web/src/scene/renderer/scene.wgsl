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
struct Object { model: mat4x4f, normal: mat4x4f, effects: vec4f, joint: vec4f };
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var shadowSampler: sampler_comparison;
@group(0) @binding(3) var atlas: texture_2d<f32>;
@group(0) @binding(4) var atlasSampler: sampler;
@group(1) @binding(0) var<uniform> object: Object;
struct Influence { joints: vec4f, weights: vec4f };
@group(1) @binding(1) var<storage, read> boneMatrices: array<mat4x4f>;
@group(1) @binding(2) var<storage, read> influences: array<Influence>;
struct Vertex {
  @builtin(vertex_index) index: u32,
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
  var local = v.position;
  var normal = v.normal;
  if (object.effects.z > 0.5) {
    let influence = influences[v.index];
    let skin = boneMatrices[u32(influence.joints.x)] * influence.weights.x
      + boneMatrices[u32(influence.joints.y)] * influence.weights.y
      + boneMatrices[u32(influence.joints.z)] * influence.weights.z
      + boneMatrices[u32(influence.joints.w)] * influence.weights.w;
    local = (skin * vec4f(local, 1.0)).xyz;
    normal = normalize((skin * vec4f(normal, 0.0)).xyz);
  } else {
    // Rigid characters retain their continuous elbow/knee blend. Their
    // attachments use the same pivot on the CPU in both visible and shadow passes.
    let weight = 1.0 - smoothstep(object.joint.y - 0.055, object.joint.y + 0.055, v.position.y);
    local = mix(local, object.joint.xyz + rotateJoint(local - object.joint.xyz, object.joint.w), weight);
    normal = mix(normal, rotateJoint(normal, object.joint.w), weight);
  }
  var p = object.model * vec4f(local, 1.0);
  if (object.effects.x > 0.0) {
    // Tidewater-style layered gusts: roots stay planted while two slow waves
    // bend the canopy and a shorter ripple keeps grass from moving in lockstep.
    let heightMask = select(smoothstep(0.0, 2.8, v.position.y), v.uv.y, v.material.z == 11.0);
    let rooted = heightMask * heightMask;
    let phase = frame.sun.w * (0.8 + object.effects.x * 0.12) + p.x * 0.33 + p.z * 0.21;
    let gust = 0.68 + 0.32 * sin(frame.sun.w * 0.31 + p.x * 0.08 - p.z * 0.06);
    let sway = sin(phase) * 0.022 + sin(phase * 1.73 + 1.9) * 0.012;
    let amount = sway * gust * rooted * object.effects.x;
    p.x += amount;
    p.z += amount * (0.34 + 0.16 * sin(phase * 0.7));
    p.y += sin(phase * 0.82 + p.x * 0.11) * 0.004 * rooted * object.effects.x;
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
  // Express receiver bias in metres so a larger mountain shadow volume
  // does not lift the coach's shadow away from its tyres.
  let depthScale = length(vec3f(frame.shadow[0].z, frame.shadow[1].z, frame.shadow[2].z));
  let z = sc.z / sc.w - 0.008 * depthScale;
  let texel = 1.0 / vec2f(textureDimensions(shadowMap));
  var sum = 0.0;
  for (var x = -1; x <= 1; x++) { for (var y = -1; y <= 1; y++) {
    sum += textureSampleCompareLevel(shadowMap, shadowSampler, uv + vec2f(f32(x), f32(y)) * texel, z);
  }}
  // Fade before the finite map boundary instead of drawing its rectangle
  // across a tree shadow or the road as the camera moves.
  let edge = min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y));
  let coverage = smoothstep(0.0, 0.065, edge);
  return select(mix(1.0, sum / 9.0, coverage), 1.0, z <= 0.0 || z >= 1.0);
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
  var coverage = 1.0;
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
  if (pat == 9.0) {
    let broadTone = mix(0.65, 1.15, fbm(p * 0.046));
    col = terrainSurface(p, n, dx, dy) * broadTone * (0.5 + col);
    rough = 0.96;
  } else if (usesTexture(pat)) {
    let slot = surfaceSlot(pat);
    var sample = textureSampleGrad(surfaceColor, surfaceSampler, uv, slot, ux, uy);
    if (pat >= 16.0) {
      // Alpha-tested foliage needs a coverage lookup that does not cross the
      // atlas' neighbouring leaves when the card is minified. Mip filtering
      // averages the transparent gutters with opaque pixels and turns a leaf
      // cluster into a pale rectangular sheet. Keep the colour lookup smooth,
      // but use the authored level-0 mask for the actual cutout.
      // Keep RGB on the filtered path so distant cards retain stable colour
      // instead of shimmering at mip level 0. The authored level-0 alpha is
      // still used for the cutout, so transparent gutters cannot become cards.
      let sharp = textureSampleLevel(surfaceColor, surfaceSampler, uv, slot, 0.0);
      let sharpAlpha = sharp.a;
      // Transparent texels in the source atlas still carry bright RGB. If
      // those values reach the lighting path, minified crowns become pale
      // rectangular sheets. Tighten the cutout and darken the fringe before
      // it is lit so only authored leaf colour contributes.
      coverage = smoothstep(0.5, 0.68, sharpAlpha);
      if (sharpAlpha < 0.42 || coverage <= 0.0) { discard; }
      sample.rgb = mix(vec3f(0.045, 0.085, 0.038), sample.rgb, smoothstep(0.42, 0.78, sharpAlpha));
      // tree_1 contains a trunk/branch island in the lower-right of its leaf
      // atlas. Imported tree meshes can reach that island even though their
      // leaf material is alpha-tested; exclude it while keeping the smaller
      // leaf regions used by procedural crowns.
      if (pat == 23.0 && (uv.x > 0.76 || (uv.x > 0.55 && uv.y > 0.73))) { discard; }
    }
    let arm = textureSampleGrad(surfaceArm, surfaceSampler, uv, slot, ux, uy).rgb;
    let detail = textureSampleGrad(surfaceNormal, surfaceSampler, uv, slot, ux, uy).xyz * 2.0 - 1.0;
    n = mappedNormal(n, dx, dy, ux, uy, detail * vec3f(0.65,0.65,1));
    col = select(mix(col, sample.rgb * (0.55 + col * 1.8), 0.72), col * sample.rgb, pat >= 8.0);
    rough = clamp(rough * arm.g, 0.19, 1.0);
    metal *= arm.b;
    if (pat >= 16.0) {
      // Foliage is broad, fibrous and wet-looking rather than polished. The
      // scanned ARM maps are useful for variation, but their lower roughness
      // can turn backlit leaves into pale white flashes in the opening shot.
      rough = max(rough, 0.82);
      metal = 0.0;
      if (pat == 26.0) {
        col *= vec3f(0.76, 0.86, 0.56);
      } else if (pat == 27.0) {
        col *= vec3f(0.7, 0.8, 0.46);
      } else if (pat == 23.0) {
        col *= vec3f(0.72, 0.84, 0.52);
      }
    }
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
  let directionalShadow = select(1.0, shadeShadow(i.position, n), object.effects.y > 0.5);
  lit += brdf(n, v, normalize(frame.direction.xyz), col, rough, metal) * frame.sun.rgb * directionalShadow;
  for (var j = 0; j < 12; j++) {
    let source = frame.lamps[j * 2]; let color = frame.lamps[j * 2 + 1];
    let d = source.xyz - i.position; let distance = max(dot(d, d), 0.05);
    lit += brdf(n, v, normalize(d), col, rough, metal) * color.rgb * source.w / (1.0 + distance);
  }
  lit += col * i.material.w;
  if (object.effects.w > 0.0) {
    let ghost = clamp(object.effects.w, 0.0, 1.0);
    let rim = pow(1.0 - max(dot(n, v), 0.0), 2.0);
    let spectral = vec3f(0.16, 0.42, 0.38);
    lit = mix(lit, lit * spectral + spectral * (0.12 + rim * 0.42), ghost * 0.78);
    lit += spectral * rim * ghost * 0.22;
  }
  let fog = 1.0 - exp(-distance(frame.eye.xyz, i.position) * frame.sky.w);
  lit = mix(lit, frame.sky.rgb * 0.7, fog);
  return vec4f(film(lit), coverage);
}
