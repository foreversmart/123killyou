import type { SceneActor } from '@/shared/types/game';
import type { CharacterRig } from '@/scene/world_character/model';
import type { Performance } from '@/scene/world_character/performance';
import { armPose } from '@/scene/world_character/day_actions';
import { HEAD_MOTION_RATE } from '@/scene/world_character/motion_rates';

export function isActorSpeaking(actor: SceneActor, speaker: string) {
  return Boolean(
    actor.visible &&
    actor.name &&
    !/心声|门外/.test(speaker) &&
    (speaker === actor.name ||
      speaker.startsWith(actor.name + '（') ||
      speaker.startsWith(actor.name + '·')),
  );
}

/** Speech has its own clock: a new line must not restart walking or writing. */
export function speechMotion(
  rig: CharacterRig,
  actor: SceneActor,
  speaker: () => string,
  speakingNod = false,
) {
  return (action: Performance, delta: number) => {
    const state = (rig.root.animationState ??= {});
    const motion = (state.speech ??= { weight: 0, time: 0 });
    const speaking = isActorSpeaking(actor, speaker());
    const step = Math.max(0, Math.min(delta, 0.1));
    if (speaking && motion.weight === 0) motion.time = 0;
    motion.weight = Math.max(0, Math.min(1, motion.weight + step * (speaking ? 5 : -4)));
    motion.time += step;
    const { weight, time } = motion;
    const jaw = rig.head.children[0].bend;
    if (jaw) jaw.angle = (0.018 + Math.abs(Math.sin(time * 8.3)) * 0.075) * weight;
    if (speakingNod) {
      // Small speech beats use their own rhythm, independent of slow ambient glances.
      rig.head.rotation[0] +=
        Math.sin(time * 4.2) * (0.028 + Math.sin(time * 1.1) * 0.008) * weight;
      return;
    }
    if (!weight || !['idle', 'admire', 'look_up', 'welcome'].includes(action)) return;
    rig.head.rotation[0] += Math.sin(time * 3.4 * HEAD_MOTION_RATE) * 0.045 * weight;
    rig.head.rotation[1] += Math.sin(time * 1.6 * HEAD_MOTION_RATE) * 0.07 * weight;
    // Visitors add a small forearm beat while Lu Chen keeps his hands still.
    if (!['idle', 'welcome'].includes(action)) return;
    const gesture = (0.5 + Math.sin(time * 2.1) * 0.5) * weight;
    if (actor.id !== 'luchen') {
      armPose(rig, 0, -0.06 - 0.18 * weight, -0.09 - 0.55 * weight - 0.3 * gesture, 0.12 * weight);
      rig.hands[0].rotation[2] = -0.18 * gesture;
    }
  };
}
