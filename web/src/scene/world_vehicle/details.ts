import { Builder } from '@/scene/geometry/builder';
import { plaque } from '@/scene/world_environment/architecture';
import { finish, panel } from '@/scene/world_vehicle/body';

export function coachDetails(b: Builder, doorOpen = false) {
  // Passenger door is on the coach's right (-X when local +Z is forward).
  if (!doorOpen) {
    panel(b, [0.04, 2.19, 0.91], [-1.267, 1.69, 3.91], finish.rubber, 0.019);
    panel(b, [0.045, 1.42, 0.79], [-1.29, 2.02, 3.91], finish.glass, 0.02);
    panel(b, [0.05, 0.64, 0.79], [-1.295, 0.93, 3.91], finish.teal, 0.024);
    b.box([0.018, 2.11, 0.027], [-1.324, 1.69, 3.91], finish.chrome);
    b.box([0.06, 0.22, 0.037], [-1.33, 1.4, 3.68], finish.chrome);
    for (const y of [0.68, 0.83, 0.98])
      b.box([0.055, 0.018, 0.7], [-1.325, y, 3.91], finish.chrome);
  }
  for (const side of [-1, 1]) {
    b.rod([side * 1.12, 2.79, 4.51], [side * 1.56, 2.79, 4.72], 0.045, finish.trim);
    b.rod([side * 1.56, 2.79, 4.72], [side * 1.6, 2.45, 4.78], 0.037, finish.trim);
    panel(b, [0.23, 0.49, 0.23], [side * 1.6, 2.32, 4.8], finish.trim, 0.1);
    panel(b, [0.18, 0.39, 0.025], [side * 1.6, 2.32, 4.67], finish.chrome, 0.012);
    panel(b, [0.52, 0.23, 0.06], [side * 0.81, 1.1, 4.79], finish.trim, 0.025);
    for (const dx of [-0.12, 0.12])
      panel(
        b,
        [0.17, 0.13, 0.065],
        [side * 0.81 + dx, 1.12, 4.83],
        { color: 0xdee8e5, rough: 0.14, metal: 0.35, glow: 0.25 },
        0.03,
      );
    panel(
      b,
      [0.32, 0.035, 0.07],
      [side * 0.81, 0.99, 4.82],
      { color: 0xd99a42, rough: 0.3 },
      0.016,
    );
    panel(b, [0.23, 0.62, 0.09], [side * 1.0, 1.15, -4.79], finish.trim, 0.044);
    for (const [y, color] of [
      [1.34, 0x9b2220],
      [1.15, 0xe2a046],
      [0.96, 0x9b2220],
    ])
      panel(
        b,
        [0.17, 0.15, 0.08],
        [side * 1.0, y, -4.85],
        { color, rough: 0.23, glow: 0.12 },
        0.035,
      );
    b.rod([side * 0.77, 1.83, 4.98], [side * 0.36, 2.08, 4.96], 0.015, finish.trim);
    b.rod([side * 0.36, 2.08, 4.96], [side * 0.17, 2.49, 4.94], 0.019, finish.rubber);
  }
  // Fine grille slats, towing cover, plate recesses and rear engine ventilation.
  panel(b, [1.02, 0.21, 0.045], [0, 1.13, 4.79], finish.rubber, 0.02);
  for (let i = 0; i < 4; i++)
    b.box([0.91, 0.018, 0.025], [0, 1.06 + i * 0.045, 4.82], finish.chrome);
  panel(b, [1.47, 0.56, 0.045], [0, 1.37, -4.79], finish.trim, 0.02);
  for (let i = 0; i < 8; i++)
    b.box([1.38, 0.035, 0.03], [0, 1.14 + i * 0.065, -4.82], finish.paint);
  for (const end of [-1, 1]) {
    panel(b, [0.49, 0.19, 0.06], [0, 0.7, end * 4.83], finish.rubber, 0.028);
    panel(b, [0.42, 0.13, 0.065], [0, 0.7, end * 4.86], { color: 0xbb963f, rough: 0.43 }, 0.018);
  }
  plaque(b, '红烛寺 · 客运', [0, 2.79, 4.94], 1.25, 0.17);
}
