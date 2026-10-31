import type { GameState } from '@/shared/types/game';
import type { World, WorldMode, V3 } from '@/scene/world/types';
import type { Place } from '@/scene/world/scene_state';
import { visibleActors } from '@/scene/world/scene_state';
import { actorPositions } from '@/scene/world/placement';
import { identityOf } from '@/scene/world_character/identity';
import { characterModel } from '@/scene/world_character/model';
import { animateCharacter } from '@/scene/world_character/animation';
import { ease } from '@/scene/world_character/joints';
import { actorFacing, actorMovement, movementPosition } from '@/scene/world/movement';

export function addCast(world: World, state: GameState, place: Place, mode: WorldMode) {
  visibleActors(state, mode).forEach((actor, index) => {
    const identity = identityOf(actor.id, actor.portrait);
    if (!identity) return;
    const walking =
      (mode === 'travel' || mode === 'hall') &&
      !(state.sceneKey === 'mini_ending' && actor.id === 'luchen');
    const seated =
      !walking &&
      ((place === 'register' && actor.id === 'luchen') ||
        (place === 'refectory' && ['linlan', 'zhouyan', 'xuzhi'].includes(actor.id)) ||
        (place === 'oracle' && !state.flags.cup_jiao_rescue));
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
    if (walking) {
      if (mode === 'hall') {
        const hallLine: Record<string, V3> = {
          luchen: [2.2, 0, 1.2],
          linlan: [1.55, 0, 0.75],
          zhouyan: [0.85, 0, 0.3],
          xuzhi: [0.15, 0, -0.15],
        };
        position = hallLine[actor.id] || [2 - index * 0.65, 0, 1.5 - index * 0.7];
      } else if (state.sceneKey !== 'mini_ending') {
        // Start at the near end of the covered passage. The offsets keep the
        // group in a loose conversational stagger while the movement system
        // carries them all the way to the far end.
        const corridorLine: Record<string, V3> = {
          luchen: [0, 0, 6.2],
          linlan: [-0.38, 0, 5.75],
          zhouyan: [0.08, 0, 5.3],
          xuzhi: [0.45, 0, 4.85],
        };
        position = corridorLine[actor.id] || [index * 0.18 - 0.3, 0, 5.8 - index * 0.45];
      } else {
        position = [index % 2 ? 0.8 : -0.8, 0, -1 - index * 1.1];
      }
    }
    rig.root.position = [...position];
    rig.root.rotation[1] = walking
      ? mode === 'hall'
        ? -Math.PI / 2
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
    const movement = actorMovement(actor, state, mode, rig.root.position);
    const { held, heldBowl } = animateCharacter(rig, actor, state, {
      walkDuration: movement?.duration,
      traveling: walking,
      alighting: mode === 'alighting',
      speaker: () => world.speaker || '',
    });
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
    const authoredFacing = actorFacing(
      actor,
      state,
      rig.root.position,
      actor.id === 'skin_double' ? Math.PI : rig.root.rotation[1],
    );
    if (movement) {
      const perform = rig.root.animate!;
      const heading = Math.atan2(
        movement.to[0] - movement.from[0],
        movement.to[2] - movement.from[2],
      );
      // A corridor travel ends at a side doorway. Keep the walking heading
      // while moving, then turn toward that doorway during the short settle
      // window. This makes the stop readable and keeps the rig from facing
      // through the corridor's end wall.
      const endFacing = movement.endFacing ?? authoredFacing;
      const turn = Math.atan2(Math.sin(endFacing - heading), Math.cos(endFacing - heading));
      rig.root.position = [...movement.from];
      rig.root.animate = (t, dt) => {
        perform(t, dt);
        rig.root.position = movementPosition(movement, t);
        rig.root.rotation[1] = heading + turn * ease(t - movement.duration + 0.45, 0.45);
      };
    } else if (authoredFacing !== rig.root.rotation[1]) {
      const perform = rig.root.animate!;
      const origin = rig.root.rotation[1];
      const turn = Math.atan2(Math.sin(authoredFacing - origin), Math.cos(authoredFacing - origin));
      rig.root.animate = (t, dt) => {
        perform(t, dt);
        rig.root.rotation[1] = origin + turn * ease(t, 1.1);
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
