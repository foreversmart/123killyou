import type { GameState } from '@/shared/types/game';
import type { World, WorldMode, V3 } from '@/scene/world/types';
import type { Place } from '@/scene/world/scene_state';
import { visibleActors } from '@/scene/world/scene_state';
import { actorPositions } from '@/scene/world/placement';
import { identityOf } from '@/scene/world_character/identity';
import { characterModel } from '@/scene/world_character/model';
import { animateCharacter } from '@/scene/world_character/animation';
import { ease } from '@/scene/world_character/joints';

export function addCast(world: World, state: GameState, place: Place, mode: WorldMode) {
  visibleActors(state, mode).forEach((actor, index) => {
    const identity = identityOf(actor.id, actor.portrait);
    if (!identity) return;
    const walking =
      (mode === 'travel' || mode === 'hall') &&
      !(state.sceneKey === 'mini_ending' && actor.id === 'luchen');
    const latching =
      actor.id === 'skin_double' && state.shotKey === 'double_exit' && !state.flags.double_calm;
    const seated =
      (place === 'register' && actor.id === 'luchen') ||
      (place === 'refectory' && ['linlan', 'zhouyan', 'xuzhi'].includes(actor.id)) ||
      (place === 'oracle' && !state.flags.cup_jiao_rescue);
    const rig = characterModel(
      identity,
      actor.id === 'skin_double' && state.flags.double_calm
        ? 'kneeling'
        : seated
          ? 'seated'
          : 'standing',
      actor.id === 'shangong' && Boolean(state.flags.cup_failed),
    );
    let position: V3 = actorPositions[place]?.[actor.id] || [index - 1.5, 0, -1 - index * 0.5];
    if (walking)
      position =
        mode === 'hall'
          ? [-2 + index * 0.65, 0, 1.5 - index * 0.7]
          : [index % 2 ? 0.8 : -0.8, 0, -1 - index * 1.1];
    rig.root.position = [...position];
    rig.root.rotation[1] = walking
      ? mode === 'hall'
        ? Math.PI / 2
        : Math.PI
      : Math.atan2(world.camera.eye[0] - position[0], world.camera.eye[2] - position[2]) * 0.5;
    if (place === 'refectory' && !walking) {
      if (actor.id === 'linlan') rig.root.rotation[1] = 1.2;
      if (actor.id === 'xuzhi') rig.root.rotation[1] = -1.2;
    }
    if (place === 'register' && actor.id === 'luchen') rig.root.rotation[1] = 0;
    if (actor.id === 'huipu' && place === 'listen') {
      rig.root.position = [-2.7, 0.35, -1.65];
      rig.root.rotation = [-0.95, -Math.PI / 2, 0];
    }
    if (actor.id === 'victim') {
      rig.root.rotation[2] = Math.PI / 2;
      rig.root.scale = [0.85, 0.85, 0.85];
    }
    if (actor.id === 'skin_double' && state.flags.double_calm) {
      rig.root.position = [-2.8, 0, 0.25];
      rig.root.rotation[1] = 0.1;
    }
    const duration = latching
      ? 1.6
      : mode === 'hall'
        ? 7
        : state.sceneKey === 'mini_corridor_candle'
          ? 4
          : 3;
    const { held, heldBowl } = animateCharacter(rig, actor, state, walking, duration);
    if (actor.id !== 'victim') {
      world.lighting.contacts ||= [];
      for (const knee of rig.knees)
        world.lighting.contacts.push({
          position: [0, 0, 0],
          radius: rig.pose === 'kneeling' ? 0.2 : 0.14,
          anchor:
            rig.pose === 'kneeling'
              ? { node: knee, offset: [0, -0.025, 0] }
              : { node: knee.children[0], offset: [0, -0.045, 0.015] },
        });
    }
    if (walking || latching) {
      const perform = rig.root.animate!;
      const origin = [...rig.root.position] as V3;
      rig.root.animate = (t, dt) => {
        perform(t, dt);
        if (latching) {
          const progress = ease(t, duration);
          rig.root.position = [
            origin[0] + (2.55 - origin[0]) * progress,
            0,
            origin[2] + (-3.2 - origin[2]) * progress,
          ];
          rig.root.rotation[1] = Math.PI - 0.4 * (1 - progress);
          return;
        }
        const distance = Math.min(t, duration) * 0.43 * ease(t, 0.35);
        rig.root.position =
          mode === 'hall'
            ? [origin[0] + distance, origin[1], origin[2]]
            : [origin[0], origin[1], origin[2] - distance];
      };
    }
    if (held) {
      const hotspot = world.hotspots.find((prop) => prop.id === 'candle');
      if (hotspot) hotspot.anchor = { node: held, offset: [0, 0.3, 0] };
      if (actor.id === 'shangong' && world.lighting.lamps[0])
        world.lighting.lamps[0].anchor = { node: held, offset: [0, 0.55, 0] };
    }
    if (heldBowl) {
      const hotspot = world.hotspots.find((prop) => prop.id === actor.id + '_bowl');
      if (hotspot) hotspot.anchor = { node: heldBowl, offset: [0, 0.08, 0] };
    }
    world.root.children.push(rig.root);
  });
}
