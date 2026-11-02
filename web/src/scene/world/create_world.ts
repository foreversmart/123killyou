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
import { corridorTravelReversed } from '@/scene/world/movement';

const corridorSurveillanceCamera = (reversed: boolean) =>
  reversed
    ? {
        eye: [-3.8, 2.55, -6.95] as [number, number, number],
        target: [0, 1.25, 0.55] as [number, number, number],
        fov: 62,
      }
    : {
        eye: [3.8, 2.55, 10.65] as [number, number, number],
        target: [0, 1.25, -1.35] as [number, number, number],
        fov: 62,
      };

const hallSurveillanceCamera = {
  // The open left door occludes the outer king from the corner; this fixed
  // raised seat sees all four faces and attributes through the clear opening.
  eye: [-0.8, 3.05, 8.55] as [number, number, number],
  target: [0, 1.35, -1.15] as [number, number, number],
  fov: 62,
};

const gateSurveillanceCamera = {
  eye: [-5.2, 3.9, 12.8] as [number, number, number],
  target: [-0.8, 1.35, 0.3] as [number, number, number],
  fov: 60,
};

export function createWorld({ state, mode = 'story' }: WorldInput): World {
  const place = scenePlace(state, mode),
    day = isDaylight(state, mode);
  const world: World = {
    root: node('temple'),
    hotspots: [],
    camera: { ...cameras[place] },
    lighting: sceneLighting(state, place, day),
  };
  if (mode === 'travel') {
    world.camera =
      state.sceneKey === 'mini_ending'
        ? { ...gateSurveillanceCamera }
        : { ...corridorSurveillanceCamera(corridorTravelReversed(state)) };
  } else if (mode === 'hall') {
    world.camera = { ...hallSurveillanceCamera };
  }
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
  if (mode === 'alighting')
    world.camera = { eye: [-1.1, 2.4, 11.8], target: [-3.2, 1.55, 1.2], fov: 56 };
  return world;
}
