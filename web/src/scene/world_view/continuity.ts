import type { World } from '@/scene/world/types';

/** Carry visible placement and the distance-based gait across gate shots. */
export function carryCharacterContinuity(previous: World, next: World, time: number) {
  const previousByName = new Map(
    previous.root.children.filter((child) => child.animate).map((child) => [child.name, child]),
  );
  for (const child of next.root.children) {
    const outgoing = previousByName.get(child.name);
    if (!outgoing || !child.animate) continue;
    child.animationContinuity = {
      position: [...outgoing.position],
      rotationY: outgoing.rotation[1],
      time,
      gait: outgoing.gait,
    };
  }
}
