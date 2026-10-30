import { node, type World, type WorldInput } from '@/scene/world/types';
import { scenePlace, isDaylight } from '@/scene/world/scene_state';
import { cameras } from '@/scene/world/placement';
import { sceneLighting } from '@/scene/world/lighting';
import { templeGate, corridor } from '@/scene/world_environment/exterior';
import { interior } from '@/scene/world_environment/interiors';
import { bus, road } from '@/scene/world_environment/road';
import { addProps } from '@/scene/world/props';
import { addCast } from '@/scene/world/cast';
import { applyDetailCamera } from '@/scene/world/details';
import { addStoryEvents } from '@/scene/world/events';
import { addInvestigation } from '@/scene/world/investigations';

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
          ? road(state.sceneKey === 'mini_ending')
          : interior(place, doorState, day);
  world.root.children.push(environment);
  if (place === 'gate') {
    const vehicle = bus();
    vehicle.position = [-6.8, 0, 3];
    vehicle.rotation[1] = -0.2;
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
  if (mode === 'story') applyDetailCamera(world, state);
  if (mode === 'story') addInvestigation(world, state);
  if (mode === 'travel') {
    const initial = world.camera.eye[2];
    world.root.animate = (t) => {
      world.camera.eye = [Math.sin(t * 2.7) * 0.025, 1.68, initial - Math.min(t, 3) * 0.4];
    };
  }
  if (mode === 'hall')
    world.root.animate = (t) => {
      world.camera.eye = [-1.5 + Math.min(t, 7) * 0.3, 1.68, 6.5];
    };
  if (mode === 'alighting')
    world.camera = { eye: [-3.7, 1.68, 6.4], target: [0, 1.6, -0.5], fov: 56 };
  return world;
}
