import type { GameState, SceneActor } from '@/shared/types/game';
import type { V3, WorldMode } from '@/scene/world/types';
import type { Performance } from '@/scene/world_character/performance';
import { ease } from '@/scene/world_character/joints';
import { gateVisitPose } from '@/scene/world/gate_visit';
import { isSleepInterlude } from '@/scene/world/sleep';
import { listenMovement, listenRoutePosition } from '@/scene/world/listen_route';
import { boardingMovement, timedPathPosition } from '@/scene/world/boarding_route';
import {
  createRegisterFlockMotion,
  flockMemberPosition,
  registerFlockStartPosition,
  registerFlockTargetPosition,
  type FlockMotion,
} from '@/scene/world/register_flock';
import {
  CORRIDOR_TRAVEL_LISTEN_SECONDS,
  CORRIDOR_TRAVEL_REFECTORY_SECONDS,
  CORRIDOR_TRAVEL_REGISTER_SECONDS,
  CORRIDOR_TRAVEL_RETURN_SECONDS,
  HALL_TRAVEL_SECONDS,
  ROOM_SLEEP_WALK_SECONDS,
} from '@/shared/lib/story_timing';

export type Movement = {
  from: V3;
  to: V3;
  duration: number;
  actorId?: string;
  /** A shared, deterministic flock used by the gate-to-registration walk. */
  flock?: FlockMotion;
  /** Facing to settle on once the group reaches a side doorway. */
  endFacing?: number;
  path?: V3[];
  pathTimes?: number[];
};

/** Sample the same visit route regardless of the current line or hand action. */
export function gateActivityPosition(
  actor: SceneActor,
  state: GameState,
  _action: Performance,
  time: number,
  base: V3,
): V3 {
  return state.sceneKey === 'mini_arrival' ? gateVisitPose(actor.id, time, base).position : base;
}

// The corridor's end wall is at z=-7.8. Keep the procession on the near side
// of that wall; the following hall phase owns the doorway crossing and builds
// a new environment there. Sending the actors deeper into the corridor made
// them visibly pass through the plaster end wall during the travel shot.
// Leave a full body length in front of the end wall. The old -6.85 endpoint
// put feet inside the wall's timber threshold on the final frame, especially
// when a transition was paused just after the easing completed.
export const CORRIDOR_TRAVEL_END_Z = -6.28;
/** The open, outer end of the east courtyard corridor. */
export const CORRIDOR_TRAVEL_START_Z = 5.7;

export function corridorTravelReversed(state: GameState) {
  return ['mini_corridor_candle', 'mini_room', 'mini_listen'].includes(state.sceneKey || '');
}

export function corridorTravelDuration(state: GameState) {
  if (state.sceneKey === 'mini_refectory') return CORRIDOR_TRAVEL_REFECTORY_SECONDS;
  if (state.sceneKey === 'mini_register') return CORRIDOR_TRAVEL_REGISTER_SECONDS;
  if (state.sceneKey === 'mini_listen') return CORRIDOR_TRAVEL_LISTEN_SECONDS;
  return CORRIDOR_TRAVEL_RETURN_SECONDS;
}

const corridorEndFacing: Record<string, number> = {
  // Guests fan toward the room doors on both sides instead of stopping as a
  // rigid line facing the plaster wall.
  linlan: -Math.PI / 2,
  zhouyan: Math.PI / 2,
  xuzhi: Math.PI / 2,
  luchen: -Math.PI / 2,
};

export function actorFacing(actor: SceneActor, state: GameState, position: V3, fallback: number) {
  let target: V3 | undefined;
  if (
    state.sceneKey === 'mini_register' &&
    ['register_desk', 'register_drag_mark'].includes(state.shotKey || '')
  ) {
    // Everyone is gathered around the ledger. Body orientation stays on the
    // desk and keeper while each dedicated performance supplies a small
    // camera check or glance, so a line delivery never snaps a guest toward
    // the player.
    // Keep the torso aimed at Lu Chen for all three guests. Xu Zhi's `glance`
    // performance turns her head and shoulders toward the courtyard for a
    // beat, then brings her attention back to the writing; aiming her whole
    // body at the window made the group look like three separate statues and
    // broke the shared moment around the desk.
    if (['linlan', 'zhouyan', 'xuzhi'].includes(actor.id)) target = [0, 1.1, -0.7];
  }
  if (state.sceneKey === 'mini_corridor_candle' && actor.id !== 'luchen') {
    // The fourth-act handoff is staged as a loose gathering around Lu Chen.
    // The guests keep their individual distances, but their bodies all turn
    // toward the keeper so the candle exchange remains a shared moment.
    target = [0, 1.1, -0.7];
  }
  return target ? Math.atan2(target[0] - position[0], target[2] - position[2]) : fallback;
}

export function actorMovement(
  actor: SceneActor,
  state: GameState,
  mode: WorldMode,
  position: V3,
): Movement | undefined {
  const [x, y, z] = position;
  if (mode === 'travel' && state.sceneKey === 'mini_listen') return listenMovement(actor, state);
  if (mode === 'travel' && state.sceneKey === 'mini_ending') return boardingMovement(actor);
  if (mode === 'story' && actor.id === 'player' && isSleepInterlude(state))
    return {
      from: [-2.05, 0, 0.8],
      to: [-2.05, 0, -1.55],
      duration: ROOM_SLEEP_WALK_SECONDS,
      endFacing: 0,
    };
  if (mode === 'alighting' && state.sceneKey === 'mini_arrival') {
    // The alighting tableau is a six-second group beat. Start each visible
    // actor just outside the coach's door and bring them to their authored
    // gate positions on slightly different paths so they move together.
    const paths: Record<string, { offset: V3; duration: number }> = {
      // Give the walk enough screen space to establish the gate's scale. The
      // slightly longer offsets also leave room for two clear alternating
      // steps before each person settles into the shared tableau.
      linlan: { offset: [-2.25, 0, 1.45], duration: 4.65 },
      zhouyan: { offset: [2.15, 0, 1.8], duration: 5.55 },
      xuzhi: { offset: [1.55, 0, 2.55], duration: 6.225 },
      luchen: { offset: [0, 0, -2.45], duration: 5.1 },
    };
    const path = paths[actor.id];
    if (path)
      return {
        from: [x + path.offset[0], y + path.offset[1], z + path.offset[2]],
        to: position,
        duration: path.duration,
      };
  }
  if (mode === 'travel') {
    if (state.sceneKey === 'mini_register') {
      const flock = createRegisterFlockMotion(CORRIDOR_TRAVEL_END_Z);
      const from = registerFlockStartPosition(flock, actor.id);
      const to = registerFlockTargetPosition(flock, actor.id);
      if (from && to) {
        return {
          from,
          to,
          duration: CORRIDOR_TRAVEL_REGISTER_SECONDS,
          actorId: actor.id,
          flock,
          endFacing: corridorEndFacing[actor.id],
        };
      }
    }
    const laneOffsets: Record<string, number> = {
      linlan: -0.38,
      zhouyan: 0.08,
      xuzhi: 0.45,
      luchen: 0,
    };
    const lane = laneOffsets[actor.id] ?? 0;
    const reversed = corridorTravelReversed(state);
    const duration = corridorTravelDuration(state);
    const to: V3 = reversed
      ? [x + lane, y, CORRIDOR_TRAVEL_START_Z - lane * 0.35]
      : [x + lane, y, CORRIDOR_TRAVEL_END_Z + lane * 0.35];
    return {
      from: position,
      // The east courtyard has two readable ends. Going from the side rooms
      // to the main hall runs toward the sealed end wall; returning after
      // dinner reverses the same path toward the open courtyard end.
      to,
      duration,
      // Dinner cuts straight into the hall; keep facing along the route.
      endFacing:
        state.sceneKey === 'mini_refectory'
          ? Math.atan2(to[0] - x, to[2] - z)
          : reversed
            ? undefined
            : corridorEndFacing[actor.id],
    };
  }
  if (mode === 'hall' && state.sceneKey !== 'mini_ending') {
    const laneOffsets: Record<string, number> = {
      linlan: -0.24,
      zhouyan: 0.1,
      xuzhi: 0.34,
      luchen: 0,
    };
    const lane = laneOffsets[actor.id] ?? 0;
    return {
      from: position,
      // Keep the procession compact while it crosses the main hall from the
      // right bay to the left bay; each person takes a subtly different line.
      to: [x - 5.6 + lane, y, z],
      duration: HALL_TRAVEL_SECONDS,
    };
  }
  if (actor.id === 'skin_double' && state.shotKey === 'double_exit' && !state.flags.double_calm)
    return { from: position, to: [2.55, 0, -3.2], duration: 1.6 };
  // The opening alighting phase already carries the group from the coach to
  // the authored gate positions. The following arrival dialogue shots are
  // consecutive observations of that same tableau, so they must continue
  // the next hand, gaze, or welcome action from the settled pose instead of
  // rebuilding another entrance walk.
}

export function movementPosition(movement: Movement, time: number): V3 {
  if (movement.path && movement.pathTimes)
    return timedPathPosition(movement.path, movement.pathTimes, time);
  if (movement.path) return listenRoutePosition(movement.path, time, movement.duration);
  if (movement.flock && movement.actorId)
    return flockMemberPosition(movement.flock, movement.actorId, time, movement.duration);
  const progress = ease(time, movement.duration);
  return movement.from.map((value, i) => value + (movement.to[i] - value) * progress) as V3;
}
