import type { CharacterTargets, V3, WorldNode } from '@/scene/world/types';
import { ease } from '@/scene/world_character/joints';

const BLEND_SECONDS = 0.42;
type Transform = {
  position: V3;
  rotation: V3;
  scale: V3;
  bend?: number;
};
type Sample = { node: WorldNode; from: Transform; target?: Transform };
type Transition = { time: number; root: Sample; joints: Sample[]; placement?: Transform };
const transitions = new WeakMap<WorldNode, Transition>();
const capture = (node: WorldNode): Transform => ({
  position: [...node.position],
  rotation: [...node.rotation],
  scale: [...node.scale],
  bend: node.bend?.angle,
});
function restore(node: WorldNode, value: Transform) {
  node.position = [...value.position];
  node.rotation = [...value.rotation];
  node.scale = [...value.scale];
  if (node.bend && value.bend !== undefined) node.bend.angle = value.bend;
}
const angle = (from: number, to: number, weight: number) =>
  from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * weight;
function blend(sample: Sample, progress: number) {
  const { node, from } = sample;
  const target = (sample.target = capture(node));
  node.position = from.position.map(
    (value, axis) => value + (target.position[axis] - value) * progress,
  ) as V3;
  node.rotation = from.rotation.map((value, axis) =>
    angle(value, target.rotation[axis], progress),
  ) as V3;
  node.scale = from.scale.map(
    (value, axis) => value + (target.scale[axis] - value) * progress,
  ) as V3;
  if (node.bend && from.bend !== undefined && target.bend !== undefined)
    node.bend.angle = from.bend + (target.bend - from.bend) * progress;
}

function controls(targets: CharacterTargets) {
  const nodes = new Map<string, WorldNode>();
  const visit = (node: WorldNode, path: string) => {
    nodes.set(path, node);
    const counts = new Map<string, number>();
    for (const child of node.children) {
      const index = counts.get(child.name) || 0;
      counts.set(child.name, index + 1);
      visit(child, `${path}/${child.name}:${index}`);
    }
  };
  visit(targets.body, 'body');
  // Leg mesh names differ between standing and kneeling. Match semantic
  // controls so the knees and feet still crossfade into the new posture.
  targets.legs.forEach((leg, index) => visit(leg, `leg:${index}`));
  return nodes;
}

/** Give every actor its own activity clock, including newly visible actors. */
export function continueCharacter(previous: WorldNode | undefined, next: WorldNode, time: number) {
  if (!next.animate || !next.characterKey) return;
  const sameAction = previous?.animationKey === next.animationKey;
  next.animationTimeOffset = sameAction ? previous?.animationTimeOffset || 0 : -time;
  next.animationState = {
    ...(sameAction ? previous?.animationState : {}),
    ...(previous?.animationState?.speech ? { speech: { ...previous.animationState.speech } } : {}),
  };
  if (previous?.blenderTargets && next.blenderTargets) {
    next.animationContinuity = {
      position: [...previous.position],
      rotationY: previous.rotation[1],
      rotation: [...previous.rotation],
      time: time + next.animationTimeOffset,
      gait: previous.gait,
    };
    const outgoing = controls(previous.blenderTargets);
    const joints: Sample[] = [];
    for (const [name, node] of controls(next.blenderTargets)) {
      const source = outgoing.get(name);
      if (source) joints.push({ node, from: capture(source) });
    }
    transitions.set(next, {
      time,
      root: { node: next, from: capture(previous) },
      joints,
    });
  }
  const animate = next.animate;
  next.animate = (worldTime, delta) => {
    const transition = transitions.get(next);
    if (transition) {
      for (const sample of [transition.root, ...transition.joints])
        if (sample.target) restore(sample.node, sample.target);
    }
    animate(Math.max(0, worldTime + next.animationTimeOffset!), delta);
  };
}

/** Blend placement before the distance gait samples the actual visible move. */
export function applyPlacementContinuity(root: WorldNode, time: number) {
  const continuity = root.animationContinuity;
  if (!continuity) return;
  const transition = transitions.get(root);
  if (transition) transition.root.target = capture(root);
  const progress = ease(time - continuity.time, BLEND_SECONDS);
  root.position = continuity.position.map(
    (value, axis) => value + (root.position[axis] - value) * progress,
  ) as V3;
  const rotation = continuity.rotation || [
    root.rotation[0],
    continuity.rotationY,
    root.rotation[2],
  ];
  root.rotation = rotation.map((value, axis) => angle(value, root.rotation[axis], progress)) as V3;
  if (transition) transition.placement = capture(root);
}

/** Run after both procedural and GLB poses, before sockets and skin palettes. */
export function applyCharacterContinuity(root: WorldNode, worldTime: number) {
  const transition = transitions.get(root);
  if (!transition) return;
  const progress = ease(worldTime - transition.time, BLEND_SECONDS);
  if (progress >= 1) {
    transitions.delete(root);
    root.animationContinuity = undefined;
    return;
  }
  // Sleep and similar authored poses can take over the root after gait.
  // Blend that final placement once; ordinary walking was blended before gait.
  const placement = transition.placement;
  if (
    !placement ||
    root.position.some((value, axis) => value !== placement.position[axis]) ||
    root.rotation.some((value, axis) => value !== placement.rotation[axis])
  )
    blend(transition.root, progress);
  for (const sample of transition.joints) blend(sample, progress);
}
