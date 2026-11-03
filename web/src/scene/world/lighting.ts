import type { Lighting } from '@/scene/world/types';
import type { Place } from '@/scene/world/scene_state';
import type { GameState } from '@/shared/types/game';
import { gardenLightPositions } from '@/scene/world_environment/courtyard_lights';
import { guardianLampPositions } from '@/scene/world_environment/shrine_details';

// Keep the daytime composition in the same late-afternoon window as
// Tidewater. The solar direction is used as the actual key light direction,
// so long shadows, warm edges and the sky all agree on where the sun is.
const GOLDEN_HOUR = { hours: 16.2, latitude: 24, declination: 6 };

function sunDirectionAt(
  hours: number,
  latitude: number,
  declination: number,
): [number, number, number] {
  const radians = Math.PI / 180;
  const phi = latitude * radians;
  const dec = declination * radians;
  const hourAngle = (hours - 12) * 15 * radians;
  const east = -Math.cos(dec) * Math.sin(hourAngle);
  const north = Math.cos(phi) * Math.sin(dec) - Math.sin(phi) * Math.cos(dec) * Math.cos(hourAngle);
  const up = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle);
  return [east, up, -north];
}

const GOLDEN_HOUR_SUN = sunDirectionAt(
  GOLDEN_HOUR.hours,
  GOLDEN_HOUR.latitude,
  GOLDEN_HOUR.declination,
);

export function sceneLighting(state: GameState, place: Place, day: boolean): Lighting {
  const sunset = place === 'refectory';
  const indoor = ['register', 'refectory', 'bedroom', 'listen', 'oracle', 'hall'].includes(place);
  // The opening, check-in and dinner beats are the late-afternoon window. The
  // return journey remains a true dawn so its story lighting stays legible.
  const lateAfternoon = day && !['mini_dawn', 'mini_ending'].includes(state.sceneKey || '');
  const light: Lighting = {
    daylight: day,
    // The cool blue-grey fill is retained in shade, while the low sun shifts
    // the open sky and timber toward a restrained golden-hour palette.
    sky: day
      ? indoor
        ? lateAfternoon
          ? [0.13, 0.145, 0.16]
          : [0.12, 0.15, 0.16]
        : lateAfternoon
          ? [0.24, 0.28, 0.34]
          : [0.22, 0.29, 0.36]
      : [0.012, 0.022, 0.038],
    ground: day
      ? indoor
        ? lateAfternoon
          ? [0.095, 0.058, 0.041]
          : [0.09, 0.056, 0.042]
        : lateAfternoon
          ? [0.07, 0.074, 0.052]
          : [0.065, 0.075, 0.055]
      : [0.009, 0.011, 0.016],
    sun: lateAfternoon
      ? indoor
        ? sunset
          ? [3.8, 1.92, 0.78]
          : [3.25, 1.94, 0.98]
        : sunset
          ? [3.65, 2.08, 0.86]
          : [3.75, 2.32, 1.15]
      : day
        ? indoor
          ? sunset
            ? [3.9, 2.1, 0.92]
            : [3.0, 2.2, 1.55]
          : sunset
            ? [3.4, 2.1, 1.05]
            : [3.0, 2.65, 1.95]
        : [0.14, 0.24, 0.42],
    direction: lateAfternoon ? GOLDEN_HOUR_SUN : indoor ? [-0.58, 0.78, 0.62] : [-0.65, 0.8, 0.55],
    fog: lateAfternoon
      ? place === 'road' || place === 'gate'
        ? 0.002
        : indoor
          ? 0.0025
          : 0.004
      : day
        ? place === 'road' || place === 'gate'
          ? 0.0016
          : indoor
            ? 0.0022
            : 0.0035
        : 0.013,
    exposure: lateAfternoon ? (indoor ? 1.18 : 1.12) : day ? (indoor ? 1.16 : 1.1) : 1.34,
    // The road camera looks down across the valley, so a broad low mist
    // volume gives the distant ridges the layered air of the reference image.
    atmosphere: day && place === 'road' ? [0.075, 7.5, 8.5, 180] : [0, 0, 0, 0],
    // The moving mountain view needs the road, coach and nearby trees in one
    // stable volume. Interior scenes retain their finer local shadow detail.
    shadowRadius: place === 'road' ? 96 : 16,
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
    light.sky = lateAfternoon
      ? [0.29, 0.32, 0.37]
      : day
        ? [0.34, 0.4, 0.45]
        : [0.035, 0.055, 0.095];
    light.ground = lateAfternoon
      ? [0.085, 0.09, 0.066]
      : day
        ? [0.1, 0.11, 0.085]
        : [0.022, 0.023, 0.03];
    light.sun = lateAfternoon ? [3.15, 2.08, 1.18] : day ? [2.8, 2.65, 2.3] : [0.18, 0.29, 0.48];
    light.fog = lateAfternoon ? 0.0025 : day ? 0.002 : 0.007;
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
      position: [-2.55, 1.7, 3.4],
      color: [0.6, 0.68, 0.75],
      power: state.flags.vase_broken ? 0.6 : 1.3,
    });
    // Cold spill from the existing window reveals the two silhouettes;
    // there is no burning lamp inside the room.
    light.lamps.push({ position: [-4.3, 2.35, -2.9], color: [0.52, 0.65, 0.82], power: 2.4 });
  }
  if (state.sceneKey === 'mini_death') {
    light.sky = [0.009, 0.012, 0.02];
    light.sun = [0.03, 0.04, 0.06];
  }
  return light;
}
