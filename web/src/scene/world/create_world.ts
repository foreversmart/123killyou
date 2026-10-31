import { node, type World, type WorldInput } from '@/scene/world/types';
import { scenePlace, isDaylight } from '@/scene/world/scene_state';
import { cameras } from '@/scene/world/placement';
import { sceneLighting } from '@/scene/world/lighting';
import { templeGate, corridor } from '@/scene/world_environment/exterior';
import { interior } from '@/scene/world_environment/interiors';
import { road } from '@/scene/world_environment/road';
import { coach } from '@/scene/world_vehicle/coach';
import { addProps } from '@/scene/world/props';
import { addCast } from '@/scene/world/cast';
import { applyDetailCamera, applySleepCamera } from '@/scene/world/details';
import { addStoryEvents } from '@/scene/world/events';
import { addInvestigation } from '@/scene/world/investigations';
import { CORRIDOR_TRAVEL_END_Z } from '@/scene/world/movement';

export function createWorld({ state, mode = 'story' }: WorldInput): World {
  const place = scenePlace(state, mode),
    day = isDaylight(state, mode);
  const world: World = {
    root: node('temple'),
    hotspots: [],
    camera: { ...cameras[place] },
    lighting: sceneLighting(state, place, day),
  };
  const doorState =
    state.sceneKey === 'mini_death'
      ? 'open'
      : state.shotKey === 'double_frenzy'
        ? 'opening'
        : place === 'listen'
          ? 'ajar'
          : 'closed';
  const environment =
    place === 'gate'
      ? templeGate()
      : place === 'corridor'
        ? corridor(day)
        : place === 'road'
          ? road(state.sceneKey === 'mini_ending', world.camera)
          : interior(place, doorState, day);
  world.root.children.push(environment);
  if (place === 'gate') {
    const vehicle = coach().root;
    vehicle.position = [-6.4, 0, 3.5];
    vehicle.rotation[1] = Math.PI;
    world.root.children.push(vehicle);
  }
  const death = state.sceneKey === 'mini_death';
  const propState = death
    ? { ...state, sceneKey: state.retryScene || state.shotKey?.replace(/^death_/, ''), shotKey: '' }
    : state;
  if (mode === 'story' || mode === 'alighting')
    addProps(world, propState, place, mode === 'story' && !death);
  addCast(world, state, place, mode);
  if (mode === 'story') addStoryEvents(world, state);
  if (mode === 'story') {
    applyDetailCamera(world, state);
    applySleepCamera(world, state);
  }
  if (mode === 'story') addInvestigation(world, state);
  if (mode === 'travel' && state.sceneKey !== 'mini_ending') {
    const initialEye = [...world.camera.eye] as [number, number, number];
    const initialTarget = [...world.camera.target] as [number, number, number];
    const distance = CORRIDOR_TRAVEL_END_Z - initialEye[2];
    // Move the first-person camera through the same corridor span as the
    // actors. The target used to inherit the eye's full travel distance,
    // which put it several metres behind the plaster end wall. Keep the
    // target in front of the threshold, then pan toward the side doorway as
    // the group settles so the scene never looks through solid architecture.
    const travelDuration = state.sceneKey === 'mini_corridor_candle' ? 5.2 : 5.6;
    const targetEndZ = CORRIDOR_TRAVEL_END_Z - 1.35;
    const targetEndX = initialTarget[0] + (state.sceneKey === 'mini_room' ? -3.1 : 3.1);
    world.root.animate = (t) => {
      const progress = Math.min(1, Math.max(0, t / travelDuration));
      const eased = progress * progress * (3 - 2 * progress);
      const z = initialEye[2] + distance * eased;
      const endPan = Math.min(1, Math.max(0, (progress - 0.78) / 0.22));
      const pan = endPan * endPan * (3 - 2 * endPan);
      const targetZ = initialTarget[2] + (targetEndZ - initialTarget[2]) * eased;
      world.camera.eye = [initialEye[0] + Math.sin(t * 1.8) * 0.018, initialEye[1], z];
      world.camera.target = [
        initialTarget[0] + (targetEndX - initialTarget[0]) * pan,
        initialTarget[1],
        targetZ,
      ];
    };
  }
  if (mode === 'hall')
    world.root.animate = (t) => {
      world.camera.eye = [-1.5 + Math.min(t, 7) * 0.3, 1.68, 6.5];
    };
  if (mode === 'alighting')
    world.camera = { eye: [-1.1, 2.4, 11.8], target: [-3.2, 1.55, 1.2], fov: 56 };
  return world;
}
