import { Builder, materials as M } from '@/scene/geometry/builder';
import type { World } from '@/scene/world/types';
import type { GameState } from '@/shared/types/game';

export function addStoryEvents(world: World, state: GameState) {
  if (state.sceneKey === 'mini_death') {
    const dark = { color: 0x171b19, rough: 1, glow: 0.12 };
    const b = new Builder();
    b.ball([0.24, 0.52, 0.14], [0, 1.2, 0], dark);
    b.ball([0.12, 0.18, 0.1], [0.03, 1.88, 0.07], dark);
    for (const side of [-1, 1]) {
      b.rod([side * 0.2, 1.6, 0], [side * 0.4, 1.2, 0.4], 0.065, dark, 0.035);
      b.rod([side * 0.4, 1.2, 0.4], [side * 0.3, 1.4, 0.85], 0.038, dark, 0.025);
      for (let i = 0; i < 4; i++)
        b.rod(
          [side * 0.3 + i * 0.014, 1.4, 0.85],
          [side * 0.28 + i * 0.02, 1.35, 1.03],
          0.007,
          dark,
        );
      b.rod([side * 0.11, 0.9, 0], [side * 0.17, 0.08, 0.1], 0.065, dark, 0.035);
    }
    const shadow = b.mesh('intrusion_shadow');
    const dx = world.camera.target[0] - world.camera.eye[0];
    const dz = world.camera.target[2] - world.camera.eye[2];
    const distance = Math.hypot(dx, dz);
    const forward = [dx / distance, dz / distance];
    const at = (depth: number, side: number): [number, number, number] => [
      world.camera.eye[0] + forward[0] * depth - forward[1] * side,
      0,
      world.camera.eye[2] + forward[1] * depth + forward[0] * side,
    ];
    shadow.position = at(6, 0.7);
    shadow.rotation[1] = Math.atan2(-forward[0], -forward[1]);
    shadow.animate = (t) => {
      const progress = Math.min(t / 1.18, 1);
      shadow.position = at(6 - progress * 3.8, 0.7 - progress * 1.55);
      shadow.rotation[2] = Math.sin(t * 17) * 0.025 * (1 - progress);
    };
    world.root.children.push(shadow);
    const blood = new Builder();
    for (let i = 0; i < 8; i++)
      blood.ball(
        [0.18 + (i % 3) * 0.04, 0.008, 0.11 + (i % 2) * 0.04],
        [Math.sin(i * 3) * 0.8, 0.012, Math.cos(i * 2) * 0.55],
        { color: 0x4e1618, rough: 1 },
      );
    const pool = blood.mesh('blood_pool');
    pool.shadow = false;
    pool.position = at(2.6, -0.7);
    pool.animate = (t) => {
      const growth = Math.max(0.01, Math.min((t - 0.7) / 0.85, 1));
      pool.scale = [growth, 1, growth];
    };
    world.root.children.push(pool);
    world.lighting.lamps.push({ position: [0, 1.3, 3], color: [0.8, 0.11, 0.06], power: 1.1 });
  }
  if (state.shotKey === 'wake_door') {
    const wet = new Builder();
    for (let i = 0; i < 9; i++)
      wet.box(
        [0.006, 0.2 + (i % 3) * 0.1, 0.004],
        [2.05 + i * 0.08, 0.75 + (i % 3) * 0.08, -3.64],
        { color: 0x393e36, rough: 0.08 },
      );
    world.root.children.push(wet.mesh('door_moisture'));
  }
  if (state.shotKey === 'register_drag_mark') {
    const marks = new Builder();
    for (let i = 0; i < 16; i++)
      marks.box([0.018, 0.008, 0.16], [1.25 + i * 0.05, 0.008, 2 - i * 0.18], {
        ...M.stone,
        color: 0x393c33,
      });
    world.root.children.push(marks.mesh('drag_marks'));
  }
}
