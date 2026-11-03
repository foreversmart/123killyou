import type { World } from '@/scene/world/types';
import { continueCharacter } from '@/scene/world_character/continuity';

/** Carry every visible character through an update within the same place. */
export function carryCharacterContinuity(previous: World, next: World, time: number) {
  const previousByIdentity = new Map(
    previous.root.children
      .filter((child) => child.characterKey)
      .map((child) => [child.characterKey, child]),
  );
  for (const child of next.root.children) {
    if (child === previousByIdentity.get(child.characterKey)) continue;
    continueCharacter(previousByIdentity.get(child.characterKey), child, time);
  }
}
