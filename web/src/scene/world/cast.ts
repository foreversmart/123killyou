import type { GameState } from '@/shared/types/game';
import type { World, WorldMode, V3 } from '@/scene/world/types';
import type { Place } from '@/scene/world/scene_state';
import { visibleActors } from '@/scene/world/scene_state';
import { actorPositions, corridorCandlePositions } from '@/scene/world/placement';
import { identityOf } from '@/scene/world_character/identity';
import { characterModel } from '@/scene/world_character/model';
import { animateCharacter } from '@/scene/world_character/animation';
import { ease } from '@/scene/world_character/joints';
import {
  actorFacing,
  actorMovement,
  corridorTravelReversed,
  gateActivityPosition,
  movementPosition,
} from '@/scene/world/movement';
import { performanceFor } from '@/scene/world_character/performance';

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
    if (actor.id === 'player') rig.root.name = actor.id;
    let position: V3 = actorPositions[place]?.[actor.id] || [index - 1.5, 0, -1 - index * 0.5];
    if (state.sceneKey === 'mini_corridor_candle' && place === 'corridor')
      position = corridorCandlePositions[actor.id] || position;
    if (walking) {
      if (mode === 'hall') {
        const hallLine: Record<string, V3> = {
          luchen: [2.2, 0, 1.2],
          linlan: [1.55, 0, 0.75],
          zhouyan: [0.85, 0, 0.3],
          xuzhi: [0.15, 0, -0.15],
        };
        position = hallLine[actor.id] || [2 - index * 0.65, 0, 1.5 - index * 0.7];
      } else if (state.sceneKey === 'mini_register') {
        // The registration walk starts as a loose, staggered flock instead
        // of rebuilding the corridor's parallel lanes. actorMovement owns the
        // deterministic separation and follow offsets for this route.
        position = actorMovement(actor, state, mode, [0, 0, 0])?.from || [
          index * 0.18 - 0.3,
          0,
          5.8 - index * 0.45,
        ];
      } else if (state.sceneKey !== 'mini_ending') {
        // Start at the route's actual end. The refectory route begins by the
        // side rooms and walks outward; return routes begin at the open end
        // and walk back toward those rooms.
        const reversed = corridorTravelReversed(state);
        const corridorLine: Record<string, V3> = {
          luchen: [0, 0, reversed ? -6.2 : 6.2],
          linlan: [-0.38, 0, reversed ? -5.75 : 5.75],
          zhouyan: [0.08, 0, reversed ? -5.3 : 5.3],
          xuzhi: [0.45, 0, reversed ? -4.85 : 4.85],
        };
        position = corridorLine[actor.id] || [
          index * 0.18 - 0.3,
          0,
          (reversed ? -5.8 : 5.8) + (reversed ? 1 : -1) * index * 0.45,
        ];
      } else {
        position = [index % 2 ? 0.8 : -0.8, 0, -1 - index * 1.1];
      }
    }
    rig.root.position = [...position];
    rig.root.rotation[1] = walking
      ? mode === 'hall'
        ? -Math.PI / 2
        : corridorTravelReversed(state)
          ? 0
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
    const activityBase = [...rig.root.position] as V3;
    const movement = actorMovement(actor, state, mode, rig.root.position);
    const activity = performanceFor(actor, state, false, mode === 'alighting');
    const gateDrift =
      !movement &&
      mode === 'story' &&
      state.sceneKey === 'mini_arrival' &&
      state.shotKey?.startsWith('arrival_');
    const { held, heldBowl } = animateCharacter(rig, actor, state, {
      walkDuration: movement?.duration,
      traveling: walking,
      alighting: mode === 'alighting',
      gaiting: gateDrift,
      speaker: () => world.speaker || '',
    });
    const ghost =
      actor.id === 'skin_double' ||
      (actor.id === 'huipu' && (actor.status.includes('剥') || actor.status.includes('空洞')));
    if (ghost) {
      const markGhost = (node: typeof rig.root) => {
        node.ghost = 0.88;
        node.shadow = false;
        node.receiveShadow = false;
        node.children.forEach(markGhost);
      };
      markGhost(rig.root);
    }
    if (actor.id !== 'victim') {
      world.lighting.contacts ||= [];
      for (const knee of rig.knees)
        world.lighting.contacts.push({
          position: [0, 0, 0],
          radius: rig.pose === 'kneeling' ? 0.2 : 0.14,
          anchor:
            rig.pose === 'kneeling'
              ? { node: knee, offset: [0, -0.025, 0] }
              : {
                  node: knee.children[0],
                  offset: rig.root.skinTargets ? [0, 0, 0] : [0, -0.045, 0.015],
                },
        });
    }
    const authoredFacing = actorFacing(
      actor,
      state,
      rig.root.position,
      actor.id === 'skin_double' ? Math.PI : rig.root.rotation[1],
    );
    const candleGuest = state.sceneKey === 'mini_corridor_candle' && actor.id !== 'luchen';
    if (candleGuest) rig.root.rotation[1] = authoredFacing;
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
        const settle = ease(t - movement.duration + 0.675, 0.675);
        const facing = heading + turn * settle;
        rig.root.rotation[1] = Math.atan2(Math.sin(facing), Math.cos(facing));
      };
    } else if (authoredFacing !== rig.root.rotation[1] && !candleGuest) {
      const perform = rig.root.animate!;
      const origin = rig.root.rotation[1];
      const turn = Math.atan2(Math.sin(authoredFacing - origin), Math.cos(authoredFacing - origin));
      rig.root.animate = (t, dt) => {
        perform(t, dt);
        rig.root.rotation[1] = origin + turn * ease(t, 1.65);
      };
    }
    if (gateDrift) {
      const perform = rig.root.animate!;
      rig.root.animate = (t, dt) => {
        const next = gateActivityPosition(actor, state, activity, t, activityBase);
        const previous = [...rig.root.position] as V3;
        rig.root.gaitMoving = Math.hypot(next[0] - previous[0], next[2] - previous[2]) > 0.0002;
        perform(t, dt);
        rig.root.position = next;
        if (next[0] !== previous[0] || next[2] !== previous[2]) {
          const drift = Math.atan2(next[0] - previous[0], next[2] - previous[2]);
          const driftTurn = Math.atan2(
            Math.sin(drift - authoredFacing),
            Math.cos(drift - authoredFacing),
          );
          rig.root.rotation[1] = authoredFacing + driftTurn * 0.12;
        }
      };
    }
    const continuity = rig.root.animationContinuity;
    if (continuity) {
      const perform = rig.root.animate!;
      const fromPosition = [...continuity.position] as V3;
      const fromRotation = continuity.rotationY;
      rig.root.animate = (t, dt) => {
        perform(t, dt);
        const progress = ease(t - continuity.time, 0.42);
        const turn = Math.atan2(
          Math.sin(rig.root.rotation[1] - fromRotation),
          Math.cos(rig.root.rotation[1] - fromRotation),
        );
        const targetPosition = [...rig.root.position] as V3;
        rig.root.position = fromPosition.map(
          (value, index) => value + (targetPosition[index] - value) * progress,
        ) as V3;
        rig.root.rotation[1] = fromRotation + turn * progress;
        if (progress >= 1) rig.root.animationContinuity = undefined;
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
