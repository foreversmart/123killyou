import type { Lighting } from '@/scene/world/types';
import type { Place } from '@/scene/world/scene_state';
import type { GameState } from '@/shared/types/game';
import { gardenLightPositions } from '@/scene/world_environment/courtyard_lights';
import { guardianLampPositions } from '@/scene/world_environment/shrine_details';

export function sceneLighting(state: GameState, place: Place, day: boolean): Lighting {
  const sunset = place === 'refectory';
  const indoor = ['register', 'refectory', 'bedroom', 'listen', 'oracle', 'hall'].includes(place);
  const light: Lighting = {
    daylight: day,
    // Interior rooms use the reference palette: cool blue-grey fill from the
    // courtyard and a low amber key that catches the dark timber joinery.
    sky: day ? (indoor ? [0.12, 0.15, 0.16] : [0.22, 0.29, 0.36]) : [0.012, 0.022, 0.038],
    ground: day ? (indoor ? [0.09, 0.056, 0.042] : [0.065, 0.075, 0.055]) : [0.009, 0.011, 0.016],
    sun: day
      ? indoor
        ? sunset
          ? [3.9, 2.1, 0.92]
          : [3.0, 2.2, 1.55]
        : sunset
          ? [3.4, 2.1, 1.05]
          : [3.0, 2.65, 1.95]
      : [0.14, 0.24, 0.42],
    direction: indoor ? [-0.58, 0.78, 0.62] : [-0.65, 0.8, 0.55],
    fog: day ? (place === 'road' || place === 'gate' ? 0.0016 : indoor ? 0.0022 : 0.0035) : 0.013,
    exposure: day ? (indoor ? 1.16 : 1.1) : 1.34,
    lamps: [],
  };
  if (day && ['register', 'refectory', 'hall'].includes(place)) {
    light.lamps.push({ position: [-2.4, 2.35, -2.7], color: [0.7, 0.8, 0.86], power: 7.2 });
    light.lamps.push({
      position: [0.6, 2.5, 2.3],
      color: [1, 0.57, 0.26],
      power: sunset ? 9.2 : 7.5,
    });
  }
  if (place === 'hall') {
    // Four low lamps rake across the guardian plinths, leaving the ceiling
    // in shadow while bronze, vermilion and painted faces catch a hot edge.
    for (const position of guardianLampPositions)
      light.lamps.push({ position, color: [1, 0.36, 0.12], power: day ? 3.4 : 2.4 });
    light.lamps.push({
      position: [0, 2.05, -3.8],
      color: [1, 0.2, 0.06],
      power: day ? 2.7 : 2.1,
    });
  }
  if (!day && ['refectory', 'hall'].includes(place)) {
    light.lamps.push({ position: [-2.8, 2.05, -2.2], color: [1, 0.47, 0.17], power: 7.2 });
    light.lamps.push({ position: [2.5, 2.15, 1.9], color: [1, 0.62, 0.28], power: 5.8 });
    light.lamps.push({ position: [0, 1.1, -4.4], color: [1, 0.39, 0.1], power: 2.4 });
  }
  if (place === 'bedroom') {
    if (state.flags.red_candle_lit && state.sceneKey !== 'mini_death')
      light.lamps.push({ position: [-1.35, 1.25, 0.25], color: [1.0, 0.44, 0.11], power: 6.5 });
  }
  if (place === 'corridor') {
    light.sky = day ? [0.34, 0.4, 0.45] : [0.035, 0.055, 0.095];
    light.ground = day ? [0.1, 0.11, 0.085] : [0.022, 0.023, 0.03];
    light.sun = day ? [2.8, 2.65, 2.3] : [0.18, 0.29, 0.48];
    light.fog = day ? 0.002 : 0.007;
    light.lamps.push({ position: [0, 2.7, -4], color: [1, 0.66, 0.34], power: day ? 0.5 : 5 });
    for (const position of gardenLightPositions)
      light.lamps.push({ position, color: [1, 0.73, 0.42], power: day ? 0.65 : 4.2 });
    for (const x of [-4.65, 4.65])
      for (const z of [0.54, -3.91])
        light.lamps.push({
          position: [x, 1.95, z],
          color: [1, 0.68, 0.34],
          power: day ? 0.5 : 5.8,
        });
    for (const x of [-4.45, 4.45])
      light.lamps.push({
        position: [x, 0.4, 4.05],
        color: [1, 0.75, 0.48],
        power: day ? 0.3 : 2.8,
      });
  }
  if (place === 'oracle') {
    light.lamps.push({
      position: [1.2, 1.3, 0],
      color: [1, 0.55, 0.19],
      power: 7,
    });
    light.lamps.push({ position: [-3.8, 2.7, 1], color: [1, 0.48, 0.15], power: 4 });
  }
  if (place === 'listen') {
    light.sky = [0.009, 0.018, 0.028];
    light.sun = [0.05, 0.08, 0.12];
    light.lamps.push({
      position: [3, 1.7, 3.4],
      color: [0.6, 0.68, 0.75],
      power: state.flags.vase_broken ? 0.6 : 1.3,
    });
    light.lamps.push({ position: [-2.2, 2.35, -2.9], color: [1, 0.45, 0.16], power: 2.4 });
  }
  if (state.sceneKey === 'mini_death') {
    light.sky = [0.009, 0.012, 0.02];
    light.sun = [0.03, 0.04, 0.06];
  }
  return light;
}
