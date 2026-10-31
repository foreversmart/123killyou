import type { GameState, SceneActor } from '@/shared/types/game';
import type { V3, WorldMode } from '@/scene/world/types';
import { ease } from '@/scene/world_character/joints';

export type Movement = {
  from: V3;
  to: V3;
  duration: number;
  /** Facing to settle on once the group reaches a side doorway. */
  endFacing?: number;
};

// The corridor's end wall is at z=-7.8. Keep the procession on the near side
// of that wall; the following hall phase owns the doorway crossing and builds
// a new environment there. Sending the actors deeper into the corridor made
// them visibly pass through the plaster end wall during the travel shot.
// Leave a full body length in front of the end wall. The old -6.85 endpoint
// put feet inside the wall's timber threshold on the final frame, especially
// when a transition was paused just after the easing completed.
export const CORRIDOR_TRAVEL_END_Z = -6.28;

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
  if (state.sceneKey === 'mini_register' && state.shotKey === 'register_desk') {
    // Everyone is gathered around the ledger. Body orientation stays on the
    // desk and keeper while each dedicated performance supplies a small
    // camera check or glance, so a line delivery never snaps a guest toward
    // the player.
    if (actor.id === 'xuzhi') target = [2.6, 1.2, 1.1];
    else if (actor.id === 'linlan' || actor.id === 'zhouyan') target = [0, 1.1, -0.7];
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
      linlan: { offset: [-1.65, 0, 1.1], duration: 3.1 },
      zhouyan: { offset: [1.55, 0, 1.35], duration: 3.7 },
      xuzhi: { offset: [1.15, 0, 2.0], duration: 4.15 },
      luchen: { offset: [0, 0, -1.85], duration: 3.4 },
    };
    const path = paths[actor.id];
    if (path)
      return {
        from: [x + path.offset[0], y + path.offset[1], z + path.offset[2]],
        to: position,
        duration: path.duration,
      };
  }
  // Every gate beat keeps the group in motion. Let everyone enter from a
  // slightly different point at the same time so the scene reads as a shared
  // arrival instead of four hard cuts between isolated poses.
  if (
    mode === 'story' &&
    state.sceneKey === 'mini_arrival' &&
    (state.shotKey === 'arrival_gate' || state.shotKey?.startsWith('arrival_'))
  ) {
    const paths: Record<string, { offset: V3; duration: number }> = {
      linlan: { offset: [-1.2, 0, 0.5], duration: 1.8 },
      zhouyan: { offset: [0.9, 0, 0.8], duration: 1.5 },
      xuzhi: { offset: [0.65, 0, 1.1], duration: 1.8 },
      luchen: { offset: [0, 0, -0.9], duration: 1.8 },
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
    const laneOffsets: Record<string, number> = {
      linlan: -0.38,
      zhouyan: 0.08,
      xuzhi: 0.45,
      luchen: 0,
    };
    const lane = laneOffsets[actor.id] ?? 0;
    const duration = state.sceneKey === 'mini_corridor_candle' ? 5.2 : 5.6;
    return {
      from: position,
      // The corridor is authored as a long covered passage. Walk from the
      // near end to the far end, with a small lateral stagger to avoid a
      // rigid line while keeping the group close enough to converse. Stop
      // at the side-door threshold and turn toward the room before the
      // next scene takes over; this prevents a body from crossing the end
      // wall during a slow frame or paused transition.
      to: [x + lane, y, CORRIDOR_TRAVEL_END_Z + lane * 0.35],
      duration,
      endFacing: corridorEndFacing[actor.id],
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
      duration: 7,
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
  if (state.sceneKey !== 'mini_arrival') return;
  if (state.shotKey === 'arrival_unload') {
    const offsets: Record<string, V3> = {
      linlan: [-1.2, 0, 0.5],
      zhouyan: [0.9, 0, 0.8],
      xuzhi: [0.65, 0, 1.1],
      luchen: [0, 0, -0.9],
    };
    const offset = offsets[actor.id];
    if (offset) return { from: [x + offset[0], y, z + offset[2]], to: position, duration: 1.8 };
  }
  if (state.shotKey === 'arrival_zhouyan' && actor.id === 'zhouyan')
    return { from: [x - 0.7, y, z + 0.7], to: position, duration: 1.5 };
  if (state.shotKey === 'arrival_luchen' && actor.id === 'luchen')
    return { from: [x, y, z - 1.1], to: position, duration: 1.8 };
}

export function movementPosition(movement: Movement, time: number): V3 {
  const progress = ease(time, movement.duration);
  return movement.from.map((value, i) => value + (movement.to[i] - value) * progress) as V3;
}
