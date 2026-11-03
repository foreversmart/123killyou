import { HEAD_MOTION_RATE } from '@/scene/world_character/motion_rates';
import type { CharacterTargets } from '@/scene/world/types';

/** Blender-authored NPC clips and the small runtime bridge used by WebGPU. */
export const BLENDER_ACTIONS = {
  walk: { clip: 'walk', frames: 25, loop: true },
  welcome: { clip: 'welcome', frames: 45, loop: true },
  observe: { clip: 'observe', frames: 60, loop: true },
  write: { clip: 'write', frames: 48, loop: true },
  eat: { clip: 'eat', frames: 72, loop: true },
  offer: { clip: 'offer_candle', frames: 54, loop: true },
  rescue: { clip: 'offer_candle', frames: 54, loop: false },
  night: { clip: 'night', frames: 60, loop: true },
  turn: { clip: 'turn_body', frames: 48, loop: true },
  turn_body: { clip: 'turn_body', frames: 48, loop: true },
} as const;

export type BlenderAction = keyof typeof BLENDER_ACTIONS;
export type AnimationPath = 'translation' | 'rotation' | 'scale';
type Track = {
  path: AnimationPath;
  times: Float32Array;
  values: Float32Array;
  components: 3 | 4;
};
export type BlenderClip = {
  duration: number;
  tracks: Map<string, Partial<Record<AnimationPath, Track>>>;
};
export type BlenderAnimationLibrary = Map<string, BlenderClip>;

type GltfJson = {
  nodes?: { name?: string }[];
  accessors?: {
    bufferView?: number;
    byteOffset?: number;
    count: number;
    componentType: number;
    type: string;
  }[];
  bufferViews?: { byteOffset?: number; byteLength: number; byteStride?: number }[];
  buffers?: { byteLength: number }[];
  animations?: {
    name?: string;
    samplers: { input: number; output: number; interpolation?: string }[];
    channels: { sampler: number; target: { node: number; path: AnimationPath } }[];
  }[];
};

const COMPONENT_SIZE: Record<number, number> = { 5126: 4 };
const COMPONENTS: Record<string, 3 | 4 | 1> = { SCALAR: 1, VEC3: 3, VEC4: 4 };

function readAccessor(json: GltfJson, binary: ArrayBuffer, index: number) {
  const accessor = json.accessors?.[index];
  if (!accessor || accessor.componentType !== 5126)
    throw new Error('NPC GLB 仅支持 float 动画通道。');
  const count = COMPONENTS[accessor.type];
  const view = json.bufferViews?.[accessor.bufferView ?? -1];
  if (!count || !view) throw new Error('NPC GLB 动画通道数据不完整。');
  const stride = view.byteStride || count * COMPONENT_SIZE[accessor.componentType];
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const values = new Float32Array(accessor.count * count);
  const source = new DataView(binary, start, view.byteLength - (accessor.byteOffset || 0));
  for (let i = 0; i < accessor.count; i++) {
    for (let c = 0; c < count; c++)
      values[i * count + c] = source.getFloat32(i * stride + c * 4, true);
  }
  return { values, components: count as 3 | 4 };
}

function glbChunks(data: ArrayBuffer) {
  const view = new DataView(data);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('NPC GLB 头部无效。');
  let offset = 12;
  let json: GltfJson | undefined;
  let binary = new ArrayBuffer(0);
  while (offset + 8 <= data.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (type === 0x4e4f534a)
      json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, start, length)).trim());
    if (type === 0x004e4942) binary = data.slice(start, start + length);
    offset = start + length;
  }
  if (!json) throw new Error('NPC GLB 缺少 JSON chunk。');
  return { json, binary };
}

/** Parse only animation metadata and accessors; meshes stay in the existing packed runtime. */
export function parseBlenderAnimations(data: ArrayBuffer): BlenderAnimationLibrary {
  const { json, binary } = glbChunks(data);
  const library: BlenderAnimationLibrary = new Map();
  for (const animation of json.animations || []) {
    const tracks = new Map<string, Partial<Record<AnimationPath, Track>>>();
    let duration = 0;
    for (const channel of animation.channels) {
      const sampler = animation.samplers[channel.sampler];
      const nodeName = json.nodes?.[channel.target.node]?.name;
      if (!sampler || !nodeName) continue;
      const input = readAccessor(json, binary, sampler.input);
      const output = readAccessor(json, binary, sampler.output);
      const times = input.values;
      duration = Math.max(duration, times[times.length - 1] || 0);
      const byPath = tracks.get(nodeName) || {};
      byPath[channel.target.path] = {
        path: channel.target.path,
        times,
        values: output.values,
        components: output.components,
      };
      tracks.set(nodeName, byPath);
    }
    if (animation.name && tracks.size) library.set(animation.name, { duration, tracks });
  }
  return library;
}

export function blenderActionFor(action: string) {
  if (action === 'offer_candle') return BLENDER_ACTIONS.offer;
  if (action === 'turn_body') return BLENDER_ACTIONS.turn;
  const normalized = action.startsWith('walk')
    ? 'walk'
    : action === 'offer' || action === 'rescue'
      ? action
      : action === 'glance' || action === 'admire' || action === 'look_up' || action === 'inspect'
        ? 'observe'
        : action === 'hush' || action === 'uneasy' || action === 'lean' || action === 'startled'
          ? 'night'
          : action;
  return BLENDER_ACTIONS[normalized as BlenderAction];
}

export function blenderClipFor(action: string, library?: BlenderAnimationLibrary) {
  const contract = blenderActionFor(action);
  return contract && library?.get(contract.clip);
}

export function blenderFrame(action: string, seconds: number, fps = 30) {
  const clip = blenderActionFor(action);
  if (!clip) return 1;
  const length = Math.max(1, clip.frames - 1);
  const frame = seconds * fps;
  if (clip.loop) return 1 + (frame % length);
  return 1 + Math.min(length, Math.max(0, frame));
}

function sampleTrack(track: Track, time: number, rest = false) {
  const { times, values, components } = track;
  if (!times.length) return new Array(components).fill(0);
  let i = 0;
  while (i + 1 < times.length && times[i + 1] <= time) i++;
  const next = Math.min(i + 1, times.length - 1);
  const a = i * components;
  if (rest || next === i || (track.path === 'translation' && times[next] === times[i]))
    return Array.from(values.slice(a, a + components));
  const b = next * components;
  const span = Math.max(0.000001, times[next] - times[i]);
  const t = Math.max(0, Math.min(1, (time - times[i]) / span));
  if (components === 4)
    return slerp(Array.from(values.slice(a, a + 4)), Array.from(values.slice(b, b + 4)), t);
  return Array.from(
    { length: components },
    (_, c) => values[a + c] + (values[b + c] - values[a + c]) * t,
  );
}

function slerp(a: number[], b: number[], t: number) {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (dot < 0) {
    dot = -dot;
    b = b.map((v) => -v);
  }
  if (dot > 0.9995) {
    const q = a.map((v, i) => v + (b[i] - v) * t);
    const length = Math.hypot(...q);
    return q.map((v) => v / length);
  }
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return a.map((v, i) => v * wa + b[i] * wb);
}

function quatInverse(q: number[]) {
  const length = Math.max(
    0.000001,
    q.reduce((sum, v) => sum + v * v, 0),
  );
  return [-q[0] / length, -q[1] / length, -q[2] / length, q[3] / length];
}
function quatMultiply(a: number[], b: number[]) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}
function quatToEuler(q: number[]) {
  const [x, y, z, w] = q;
  return [
    Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)),
    Math.asin(Math.max(-1, Math.min(1, 2 * (w * y - z * x)))),
    Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)),
  ] as [number, number, number];
}

function deltaRotation(track: Track | undefined, time: number) {
  if (!track) return [0, 0, 0] as [number, number, number];
  const rest = sampleTrack(track, 0, true);
  const current = sampleTrack(track, time);
  return quatToEuler(quatMultiply(current, quatInverse(rest)));
}
function deltaTranslation(track: Track | undefined, time: number) {
  if (!track) return [0, 0, 0] as [number, number, number];
  const rest = sampleTrack(track, 0, true);
  const current = sampleTrack(track, time);
  return current.map((value, i) => value - rest[i]) as [number, number, number];
}
export type BlenderTargets = CharacterTargets;

/** Apply a GLB clip to the existing character shell, keeping each identity's materials and props. */
export function applyBlenderPose(
  action: string,
  seconds: number,
  library: BlenderAnimationLibrary,
  targets: BlenderTargets,
) {
  const clip = blenderClipFor(action, library);
  if (!clip) return false;
  seconds = Math.max(0, seconds + (targets.root.animationTimeOffset || 0));
  const contract = blenderActionFor(action);
  const time =
    clip.duration > 0
      ? contract?.loop
        ? seconds % clip.duration
        : Math.min(seconds, clip.duration)
      : 0;
  // Keep body travel on the authored clock and incidental head motion slow.
  const slowedTime = (rate: number) =>
    clip.duration > 0
      ? contract?.loop
        ? (seconds * rate) % clip.duration
        : Math.min(seconds * rate, clip.duration)
      : 0;
  const headTime = slowedTime(HEAD_MOTION_RATE);
  const fixedHands = targets.root.name === 'luchen';
  const track = (bone: string, path: AnimationPath) => clip.tracks.get(bone)?.[path];
  const addRotation = (node: BlenderTargets['body'], rotation: [number, number, number]) => {
    node.rotation[0] += rotation[0];
    node.rotation[1] += rotation[1];
    node.rotation[2] += rotation[2];
  };
  const pelvis = deltaRotation(track('pelvis', 'rotation'), time);
  const spine = deltaRotation(track('spine', 'rotation'), time);
  const chest = deltaRotation(track('chest', 'rotation'), time);
  const root = deltaRotation(track('root', 'rotation'), time);
  const rootMove = deltaTranslation(track('root', 'translation'), time);
  if (!fixedHands) {
    addRotation(targets.body, [
      pelvis[0] + spine[0] + chest[0],
      root[1],
      pelvis[2] + spine[2] + chest[2],
    ]);
    targets.body.position[1] += rootMove[1];
  }
  addRotation(targets.head, deltaRotation(track('head', 'rotation'), headTime));
  for (const [side, suffix] of [
    [0, 'r'],
    [1, 'l'],
  ] as const) {
    if (!fixedHands) {
      addRotation(
        targets.arms[side],
        deltaRotation(track('upper_arm_' + suffix, 'rotation'), time),
      );
      addRotation(
        targets.elbows[side],
        deltaRotation(track('forearm_' + suffix, 'rotation'), time),
      );
      addRotation(targets.hands[side], deltaRotation(track('hand_' + suffix, 'rotation'), time));
    }
    if (targets.pose === 'standing' && !targets.root.gait) {
      addRotation(targets.legs[side], deltaRotation(track('thigh_' + suffix, 'rotation'), time));
      addRotation(targets.knees[side], deltaRotation(track('shin_' + suffix, 'rotation'), time));
    }
  }
  return true;
}
