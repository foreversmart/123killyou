import type { GameState, SceneActor } from '@/shared/types/game';
import type { V3, WorldMode } from '@/scene/world/types';
import type { Performance } from '@/scene/world_character/performance';
import { ease } from '@/scene/world_character/joints';
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
};

type GateActivityProfile = {
  side: number;
  depth: number;
  pace: number;
  phase: number;
};

// Gate visitors keep sampling nearby viewpoints while their hands continue
// the authored activity. The two incommensurate waves avoid a visibly
// mechanical back-and-forth loop, while the small amplitudes keep each person
// inside the camera's established gate tableau.
const gateActivityProfiles: Partial<Record<Performance, GateActivityProfile>> = {
  camera: { side: 0.48, depth: 0.4, pace: 0.56, phase: 0.4 },
  review_camera: { side: 0.34, depth: 0.31, pace: 0.48, phase: 1.2 },
  admire: { side: 0.29, depth: 0.23, pace: 0.42, phase: 2.1 },
  look_up: { side: 0.23, depth: 0.17, pace: 0.38, phase: 2.7 },
  luggage: { side: 0.21, depth: 0.35, pace: 0.34, phase: 0.9 },
  welcome: { side: 0.26, depth: 0.2, pace: 0.36, phase: 1.8 },
  glance: { side: 0.18, depth: 0.15, pace: 0.32, phase: 2.8 },
  stretch: { side: 0.23, depth: 0.26, pace: 0.4, phase: 1.5 },
};

const gateActivitySeeds: Record<string, number> = {
  linlan: 0.15,
  zhouyan: 1.8,
  xuzhi: 3.35,
  luchen: 4.7,
};

/**
 * Return a small, activity-specific walk around the authored gate position.
 * This is deliberately a pure function so paused frames and visual rebuilds
 * produce the same placement for the same shot and elapsed time.
 */
export function gateActivityPosition(
  actor: SceneActor,
  state: GameState,
  action: Performance,
  time: number,
  base: V3,
): V3 {
  if (state.sceneKey !== 'mini_arrival' || !state.shotKey?.startsWith('arrival_')) return base;
  const profile = gateActivityProfiles[action];
  if (!profile) return base;
  const seed = (gateActivitySeeds[actor.id] ?? 0.7) + profile.phase;
  // Combining separate frequencies gives an irregular path without random
  // jumps, so a camera check can drift to a new spot and ease back naturally.
  const side =
    Math.sin(time * profile.pace + seed) * 0.62 +
    Math.sin(time * profile.pace * 1.71 + seed * 1.9) * 0.38;
  const depth =
    Math.sin(time * profile.pace * 0.83 + seed * 1.37) * 0.58 +
    Math.sin(time * profile.pace * 1.43 + seed * 0.61) * 0.42;
  const settle = ease(time, 1.1);
  return [
    base[0] + side * profile.side * settle,
    base[1],
    base[2] + depth * profile.depth * settle,
  ];
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
  if (state.sceneKey === 'mini_arrival') {
    if (actor.id === 'xuzhi' && state.shotKey === 'arrival_gate_beauty') target = [0, 3, -1];
    if (actor.id === 'linlan' && state.shotKey === 'arrival_weather') target = [0, 3, -1];
    if (actor.id === 'zhouyan' && state.shotKey === 'arrival_zhouyan') target = [-3.9, 2.7, -1.9];
    // The first gate tableau is concurrent: Zhou Yan keeps studying the old
    // plaque while Xu Zhi works the bags and Lu Chen approaches the guests.
    // Give those tasks a real visual target so a line of dialogue cannot turn
    // the group back toward the camera between beats.
    if (actor.id === 'zhouyan' && state.shotKey === 'arrival_unload') target = [-3.9, 1.8, -1.9];
    if (actor.id === 'xuzhi' && state.shotKey === 'arrival_unload') target = [3.9, 0.7, -0.8];
    if (actor.id === 'luchen' && state.shotKey === 'arrival_unload') target = [0, 1.25, 1.3];
  }
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
  return target ? Math.atan2(target[0] - position[0], target[2] - position[2]) : fallback;
}

export function actorMovement(
  actor: SceneActor,
  state: GameState,
  mode: WorldMode,
  position: V3,
): Movement | undefined {
  const [x, y, z] = position;
  if (mode === 'alighting' && state.sceneKey === 'mini_arrival') {
    // The alighting tableau is a six-second group beat. Start each visible
    // actor just outside the coach's door and bring them to their authored
    // gate positions on slightly different paths so they move together.
    const paths: Record<string, { offset: V3; duration: number }> = {
      // Give the walk enough screen space to establish the gate's scale. The
      // slightly longer offsets also leave room for two clear alternating
      // steps before each person settles into the shared tableau.
      linlan: { offset: [-2.25, 0, 1.45], duration: 3.1 },
      zhouyan: { offset: [2.15, 0, 1.8], duration: 3.7 },
      xuzhi: { offset: [1.55, 0, 2.55], duration: 4.15 },
      luchen: { offset: [0, 0, -2.45], duration: 3.4 },
    };
    const path = paths[actor.id];
    if (path)
      return {
        from: [x + path.offset[0], y + path.offset[1], z + path.offset[2]],
        to: position,
        duration: path.duration,
      };
  }
  if (
    mode === 'travel' &&
    state.sceneKey !== 'mini_ending' &&
    !(state.sceneKey === 'mini_ending' && actor.id === 'luchen')
  ) {
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
    return {
      from: position,
      // The east courtyard has two readable ends. Going from the side rooms
      // to the main hall runs toward the sealed end wall; returning after
      // dinner reverses the same path toward the open courtyard end.
      to: reversed
        ? [x + lane, y, CORRIDOR_TRAVEL_START_Z - lane * 0.35]
        : [x + lane, y, CORRIDOR_TRAVEL_END_Z + lane * 0.35],
      duration,
      endFacing: reversed ? undefined : corridorEndFacing[actor.id],
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
  if (
    (mode === 'travel' || mode === 'hall') &&
    !(state.sceneKey === 'mini_ending' && actor.id === 'luchen')
  ) {
    const duration = mode === 'hall' ? 7 : state.sceneKey === 'mini_corridor_candle' ? 4 : 3;
    return {
      from: position,
      // The main-hall tableau is viewed from the adjoining passage. Keep the
      // procession on the far side of the frame and move it right-to-left so
      // the group enters from the right and clears toward the refectory side.
      to: mode === 'hall' ? [x - duration * 0.43, y, z] : [x, y, z - duration * 0.43],
      duration,
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
  if (movement.flock && movement.actorId)
    return flockMemberPosition(movement.flock, movement.actorId, time, movement.duration);
  const progress = ease(time, movement.duration);
  return movement.from.map((value, i) => value + (movement.to[i] - value) * progress) as V3;
}
