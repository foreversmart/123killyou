import type { Lighting } from '@/scene/world/types';
import type { Place } from '@/scene/world/scene_state';
import type { GameState } from '@/shared/types/game';

export function sceneLighting(state: GameState, place: Place, day: boolean): Lighting {
  const sunset = place === 'refectory';
  const light: Lighting = {
    daylight: day,
    sky: day ? [0.22, 0.29, 0.36] : [0.023, 0.043, 0.073],
    ground: day ? [0.065, 0.075, 0.055] : [0.017, 0.019, 0.026],
    sun: day ? (sunset ? [3.4, 2.1, 1.05] : [3.0, 2.65, 1.95]) : [0.19, 0.29, 0.47],
    direction: [-0.65, 0.8, 0.55],
    fog: day ? 0.0035 : 0.016,
    exposure: day ? 1.1 : 1.45,
    lamps: [],
  };
  if (day && ['register', 'refectory', 'hall'].includes(place)) {
    light.lamps.push({ position: [-2.3, 2.2, -2.9], color: [0.82, 0.88, 1], power: 9 });
    light.lamps.push({ position: [0, 2.8, 3], color: [1, 0.86, 0.68], power: 7 });
  }
  if (place === 'bedroom') {
    if (state.flags.red_candle_lit && state.sceneKey !== 'mini_death')
      light.lamps.push({ position: [-1.35, 1.25, 0.25], color: [1.0, 0.44, 0.11], power: 6.5 });
  }
  if (place === 'corridor' || place === 'oracle') {
    light.lamps.push({
      position: place === 'oracle' ? [1.2, 1.3, 0] : [0, 2.7, -4],
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
  }
  if (state.sceneKey === 'mini_death') {
    light.sky = [0.009, 0.012, 0.02];
    light.sun = [0.03, 0.04, 0.06];
  }
  return light;
}
