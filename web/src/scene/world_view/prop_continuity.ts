import type { World, WorldNode } from '@/scene/world/types';

const offsets = new WeakMap<WorldNode, number>();

function animatedProps(world: World) {
  const result = new Map<string, WorldNode>();
  const visit = (node: WorldNode, path: string) => {
    if (node.characterKey) return;
    if (node.animate) result.set(path, node);
    const counts = new Map<string, number>();
    for (const child of node.children) {
      const index = counts.get(child.name) || 0;
      counts.set(child.name, index + 1);
      visit(child, `${path}/${child.name}:${index}`);
    }
  };
  visit(world.root, '');
  return result;
}

/** New throws/door actions start now; candle flicker and ongoing actions keep their phase. */
export function carryPropContinuity(previous: World, next: World, time: number) {
  const outgoing = animatedProps(previous);
  for (const [path, node] of animatedProps(next)) {
    const source = outgoing.get(path);
    if (source === node) continue;
    const offset =
      source && source.animationKey === node.animationKey ? offsets.get(source) || 0 : -time;
    offsets.set(node, offset);
    const animate = node.animate!;
    node.animate = (worldTime, delta) => animate(Math.max(0, worldTime + offset), delta);
  }
}
