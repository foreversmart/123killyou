import type { GameState, SceneActor } from '@/shared/types/game';
import type { CameraShot, V3 } from '@/scene/world/types';
import { CORRIDOR_TRAVEL_LISTEN_SECONDS } from '@/shared/lib/story_timing';

const companions = ['linlan', 'zhouyan', 'xuzhi'];

export function isListenDoorway(state: GameState) {
  return (
    state.sceneKey === 'mini_listen' &&
    !state.flags.skin_seen &&
    ['', 'listen_door', 'listen_cat', 'listen_bird'].includes(state.shotKey || '')
  );
}

export function listenRoomSide(state: GameState): -1 | 1 {
  const companion = (state.actors || []).find(
    (actor) => actor.visible && companions.includes(actor.id),
  );
  const id = companion?.id || companions.find((id) => !state.flags[`meal_${id}_ate`]);
  return id === 'zhouyan' ? 1 : -1;
}

/** Both people use the same route, staggered by half a step without crossing. */
export function listenActorRoute(actor: SceneActor, state: GameState): V3[] {
  const offset = actor.id === 'player' ? 0.35 : -0.35;
  const side = listenRoomSide(state);
  return [
    [4.95, 0, -2 + offset],
    [1.75, 0, -2 + offset],
    [1.75, 0, -5.9 + offset],
    [side * 4.95, 0, -5.9 + offset],
  ];
}

export function listenActorPosition(actor: SceneActor, state: GameState): V3 {
  return listenActorRoute(actor, state).at(-1)!;
}

export function listenMovement(actor: SceneActor, state: GameState) {
  const path = listenActorRoute(actor, state);
  return {
    from: path[0],
    to: path.at(-1)!,
    path,
    duration: CORRIDOR_TRAVEL_LISTEN_SECONDS - 1.2,
    endFacing: (listenRoomSide(state) * Math.PI) / 2,
  };
}

/** Distance sampling keeps the shared pace steady through the clear stone paths. */
export function listenRoutePosition(path: V3[], time: number, duration: number): V3 {
  if (time <= 0) return [...path[0]];
  if (time >= duration) return [...path.at(-1)!];
  const lengths = path
    .slice(1)
    .map((point, i) => Math.hypot(...point.map((v, j) => v - path[i][j])));
  const progress = Math.max(0, Math.min(1, time / duration));
  // A short acceleration and braking phase leaves most of the walk at an even pace.
  const ramp = 0.12;
  const distance =
    progress < ramp
      ? (progress * progress) / (2 * ramp * (1 - ramp))
      : progress > 1 - ramp
        ? 1 - (1 - progress) ** 2 / (2 * ramp * (1 - ramp))
        : (progress - ramp / 2) / (1 - ramp);
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * distance;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const fraction = remaining / lengths[i];
      return path[i].map((value, axis) => value + (path[i + 1][axis] - value) * fraction) as V3;
    }
    remaining -= lengths[i];
  }
  return [...path.at(-1)!];
}

export function listenRouteCamera(): CameraShot {
  return { eye: [0, 2.95, 5.9], target: [0.65, 1.1, -4.2], fov: 72 };
}

export function listenDoorCamera(state: GameState): CameraShot {
  const side = listenRoomSide(state);
  return { eye: [side * 1.45, 2.15, -3.35], target: [side * 5.05, 1.25, -5.9], fov: 58 };
}

export function listenPropPositions(state: GameState): Record<string, V3> {
  const side = listenRoomSide(state);
  return {
    vase: [side * 5.15, 0.02, -5.05],
    cat: [side * 5.13, 0.02, -6.82],
    bird: [side * 5.14, 2.05, -6.82],
    torch: [side * 4.65, 0.7, -5.2],
    plaque: [side * 5.35, 2.68, -6],
  };
}
