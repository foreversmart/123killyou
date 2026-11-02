import type { GameState } from '@/shared/types/game';
import type { CameraShot, V3, World } from '@/scene/world/types';
import { PLAYER_RADIUS, walkVolume, type WalkVolume } from '@/scene/world_view/player_bounds';

export type PlayerControls = {
  keys: Set<string>;
  lookYaw: number;
  lookPitch: number;
  offset: [number, number];
  velocity: [number, number];
  dragging: boolean;
  pointerId?: number;
  lastPointer: [number, number];
  world?: World;
  baseCamera?: CameraShot;
};

export function createPlayerControls(): PlayerControls {
  return {
    keys: new Set(),
    lookYaw: 0,
    lookPitch: 0,
    offset: [0, 0],
    velocity: [0, 0],
    dragging: false,
    lastPointer: [0, 0],
  };
}

export function resetPlayerControls(controls: PlayerControls, world: World) {
  controls.world = world;
  controls.baseCamera = {
    eye: [...world.camera.eye] as V3,
    target: [...world.camera.target] as V3,
    fov: world.camera.fov,
  };
  controls.lookYaw = 0;
  controls.lookPitch = 0;
  controls.offset = [0, 0];
  controls.velocity = [0, 0];
  // Preserve currently held keys across an authored shot rebuild; the global
  // keyup/blur listeners still clear them when input actually ends.
  controls.dragging = false;
  controls.pointerId = undefined;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function isBlocked(x: number, z: number, obstacle: WalkVolume['obstacles'][number]) {
  return (
    x > obstacle.x[0] - PLAYER_RADIUS &&
    x < obstacle.x[1] + PLAYER_RADIUS &&
    z > obstacle.z[0] - PLAYER_RADIUS &&
    z < obstacle.z[1] + PLAYER_RADIUS
  );
}

function resolvePosition(
  start: [number, number],
  desired: [number, number],
  volume: WalkVolume,
): [number, number] {
  let x = clamp(desired[0], volume.x[0], volume.x[1]);
  let z = clamp(desired[1], volume.z[0], volume.z[1]);
  // Sweep each axis separately so diagonal input slides along a table or wall
  // instead of getting stuck at its corner.
  for (const obstacle of volume.obstacles) {
    if (isBlocked(x, start[1], obstacle)) x = start[0];
    if (isBlocked(x, z, obstacle)) z = start[1];
  }
  return [x, z];
}

function applyCamera(controls: PlayerControls, world: World, base: CameraShot) {
  const baseHeading = Math.atan2(base.target[0] - base.eye[0], base.target[2] - base.eye[2]);
  const heading = baseHeading + controls.lookYaw;
  const forward: [number, number] = [Math.sin(heading), Math.cos(heading)];
  const horizontalDistance = Math.hypot(base.target[0] - base.eye[0], base.target[2] - base.eye[2]);
  const verticalDistance = base.target[1] - base.eye[1];
  const lookScale = Math.cos(controls.lookPitch);
  const eye: V3 = [base.eye[0] + controls.offset[0], base.eye[1], base.eye[2] + controls.offset[1]];
  const target: V3 = [
    eye[0] + forward[0] * horizontalDistance * lookScale,
    eye[1] + verticalDistance - Math.sin(controls.lookPitch) * horizontalDistance,
    eye[2] + forward[1] * horizontalDistance * lookScale,
  ];
  world.camera.eye = eye;
  world.camera.target = target;
}

/** Apply first-person walking and mouse look to the authored camera shot. */
export function updatePlayerView(
  controls: PlayerControls,
  world: World,
  state: GameState,
  delta: number,
  enabled: boolean,
) {
  if (controls.world !== world || !controls.baseCamera) resetPlayerControls(controls, world);
  const base = controls.baseCamera!;
  if (!enabled) {
    // Keep the last player position and heading during dialogue, inventory and
    // transitions. The controls are frozen, then resume without a camera snap.
    controls.velocity = [0, 0];
    applyCamera(controls, world, base);
    return;
  }

  const baseHeading = Math.atan2(base.target[0] - base.eye[0], base.target[2] - base.eye[2]);
  const heading = baseHeading + controls.lookYaw;
  const forward: [number, number] = [Math.sin(heading), Math.cos(heading)];
  const right: [number, number] = [Math.cos(heading), -Math.sin(heading)];
  const axisX = (controls.keys.has('d') ? 1 : 0) - (controls.keys.has('a') ? 1 : 0);
  const axisZ = (controls.keys.has('w') ? 1 : 0) - (controls.keys.has('s') ? 1 : 0);
  const inputLength = Math.hypot(axisX, axisZ);
  const input: [number, number] = inputLength
    ? [
        (forward[0] * axisZ + right[0] * axisX) / inputLength,
        (forward[1] * axisZ + right[1] * axisX) / inputLength,
      ]
    : [0, 0];
  const frame = Math.min(Math.max(delta, 0), 0.05);
  const acceleration = 10.5;
  const maxSpeed = 2.25;
  if (inputLength) {
    controls.velocity[0] +=
      (input[0] * maxSpeed - controls.velocity[0]) * Math.min(1, acceleration * frame);
    controls.velocity[1] +=
      (input[1] * maxSpeed - controls.velocity[1]) * Math.min(1, acceleration * frame);
  } else {
    const damping = Math.exp(-12 * frame);
    controls.velocity[0] *= damping;
    controls.velocity[1] *= damping;
  }
  const volume = walkVolume(state, base);
  const next = resolvePosition(
    controls.offset,
    [
      controls.offset[0] + controls.velocity[0] * frame,
      controls.offset[1] + controls.velocity[1] * frame,
    ],
    volume,
  );
  if (next[0] === controls.offset[0]) controls.velocity[0] = 0;
  if (next[1] === controls.offset[1]) controls.velocity[1] = 0;
  controls.offset = next;
  applyCamera(controls, world, base);
}

export function updateMouseLook(controls: PlayerControls, dx: number, dy: number) {
  controls.lookYaw = clamp(controls.lookYaw - dx * 0.004, -3.1, 3.1);
  controls.lookPitch = clamp(controls.lookPitch - dy * 0.003, -0.42, 0.42);
}
