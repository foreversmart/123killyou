import type { SceneActor } from '@/shared/types/game';

export function canShowScenePerson(actor: SceneActor): boolean {
  return (
    actor.visible &&
    !['player', 'unknown', 'companion_voice'].includes(actor.id) &&
    actor.portrait !== 'player'
  );
}
