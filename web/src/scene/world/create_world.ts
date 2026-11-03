import { node, type World, type WorldInput } from '@/scene/world/types';
import { scenePlace, isDaylight } from '@/scene/world/scene_state';
import { cameras } from '@/scene/world/placement';
import { sceneLighting } from '@/scene/world/lighting';
import { templeGate, corridor } from '@/scene/world_environment/exterior';
import { interior } from '@/scene/world_environment/interiors';
import { listenRoom } from '@/scene/world_environment/listen_room';
import { road } from '@/scene/world_environment/road';
import { coach } from '@/scene/world_vehicle/coach';
import { addProps } from '@/scene/world/props';
import { addCast } from '@/scene/world/cast';
import { applyDetailCamera, applySleepCamera } from '@/scene/world/details';
import { addStoryEvents } from '@/scene/world/events';
import { addInvestigation } from '@/scene/world/investigations';
import { corridorTravelReversed } from '@/scene/world/movement';
import { BOARDING_COACH_POSITION, BOARDING_COACH_YAW } from '@/scene/world/boarding_route';
import {
  isListenDoorway,
  listenDoorCamera,
  listenRoomSide,
  listenRouteCamera,
} from '@/scene/world/listen_route';

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
  // View the entrance from the side so the slid-back door cannot hide the
  // third step or the person climbing it before they enter the cabin.
  eye: [6, 4.8, 8] as [number, number, number],
  target: [-2.7, 1.2, 3.5] as [number, number, number],
  fov: 60,
};

export function createWorld({ state, mode = 'story' }: WorldInput, previous?: World): World {
  const place = scenePlace(state, mode),
    day = isDaylight(state, mode);
  // The rules have already settled the later extinguished candle. Preserve
  // its light only for the visible lie-down before the sleep blackout.
  const presentation =
    state.sceneKey === 'mini_wake_three_gongs' && state.shotKey === 'room_sleep_wait'
      ? { ...state, flags: { ...state.flags, red_candle_lit: true } }
      : state;
  const world: World = {
    root: node('temple'),
    hotspots: [],
    camera: { ...cameras[place] },
    lighting: sceneLighting(presentation, place, day),
  };
  if (mode === 'travel') {
    world.camera =
      state.sceneKey === 'mini_ending'
        ? { ...gateSurveillanceCamera }
        : state.sceneKey === 'mini_listen'
          ? listenRouteCamera()
          : { ...corridorSurveillanceCamera(corridorTravelReversed(state)) };
  } else if (mode === 'hall') {
    world.camera = { ...hallSurveillanceCamera };
  } else if (isListenDoorway(state)) {
    world.camera = listenDoorCamera(state);
  }
  const doorState =
    state.sceneKey === 'mini_death'
      ? 'open'
      : state.shotKey === 'double_frenzy'
        ? 'opening'
        : place === 'listen'
          ? 'ajar'
          : 'closed';
  // Static architecture survives dialogue, inventory and investigation updates.
  // Road scenery owns a moving camera closure and therefore has its own lifecycle.
  const environmentKey = JSON.stringify([
    place,
    day,
    doorState,
    place === 'listen' ? listenRoomSide(state) : null,
  ]);
  const retained = place !== 'road' && previous?.environment?.key === environmentKey;
  const environment = retained
    ? previous.environment!.root
    : place === 'gate'
      ? templeGate()
      : place === 'corridor'
        ? corridor(day)
        : place === 'road'
          ? road(state.sceneKey === 'mini_ending', world.camera)
          : place === 'listen'
            ? listenRoom(listenRoomSide(state) === 1 ? '纸' : '灯')
            : interior(place, doorState, day);
  world.environment = { key: environmentKey, root: environment };
  world.root.children.push(environment);
  if (place === 'gate') {
    const boarding = mode === 'travel' && state.sceneKey === 'mini_ending';
    const vehicle = coach({ doorOpen: boarding }).root;
    vehicle.position = boarding ? [...BOARDING_COACH_POSITION] : [-6.4, 0, 3.5];
    vehicle.rotation[1] = boarding ? BOARDING_COACH_YAW : Math.PI;
    world.root.children.push(vehicle);
  }
  const death = state.sceneKey === 'mini_death';
  const propState = death
    ? { ...state, sceneKey: state.retryScene || state.shotKey?.replace(/^death_/, ''), shotKey: '' }
    : presentation;
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
