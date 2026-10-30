import type { CharacterRig } from '@/scene/world_character/model';
import type { GameState, SceneActor } from '@/shared/types/game';
import { Builder, materials as M } from '@/scene/geometry/builder';
import { candle } from '@/scene/world_prop/ritual';
import { bowl } from '@/scene/world_prop/household';
import { node, type WorldNode } from '@/scene/world/types';
import { performanceFor } from '@/scene/world_character/performance';
import { dayAction, armPose, mealLift } from '@/scene/world_character/day_actions';
import { nightAction } from '@/scene/world_character/night_actions';
import { bend, ease } from '@/scene/world_character/joints';

export function animateCharacter(
  rig: CharacterRig,
  actor: SceneActor,
  state: GameState,
  walking = false,
  duration = 3,
) {
  const { root, body, head, arms, legs, elbows, hands, knees } = rig;
  const action = performanceFor(actor, state, walking);
  const seed = [...actor.id].reduce((n, letter) => n + letter.charCodeAt(0), 0) * 0.13;
  const bodyY = body.position[1],
    bodyPitch = body.rotation[0];
  const verse = Number(state.shotKey?.match(/double_scripture_(\d)/)?.[1] || 0);
  const still = action === 'stone' || action === 'still';
  let held: WorldNode | undefined;
  let heldBowl: WorldNode | undefined;
  let utensilsGrip: WorldNode | undefined;
  if (actor.id === 'skin_double' && state.flags.double_refused_candle) {
    const seam = new Builder();
    for (let i = 0; i < 7; i++)
      seam.rod([-0.025, 1.37 + i * 0.008, 0.075], [0.025, 1.38 + i * 0.008, 0.077], 0.002, M.black);
    const mesh = seam.mesh('collar_seam');
    mesh.position[1] = -0.82;
    body.children.push(mesh);
  }
  if (action === 'write') {
    const brush = new Builder()
      .rod([0, 0.09, 0], [0, -0.15, 0.02], 0.005, M.wood)
      .rod([0, -0.15, 0.02], [0, -0.18, 0.023], 0.006, M.black, 0.001)
      .mesh('writing_brush');
    hands[0].children.push(brush);
  }
  if (action === 'eat') {
    const utensils = new Builder();
    if (state.flags['meal_' + actor.id + '_ate']) {
      utensils.rod([0, -0.02, 0], [0, 0.04, 0.16], 0.006, M.wood);
      utensils.ball([0.024, 0.009, 0.038], [0, 0.04, 0.18], M.wood);
      const b = new Builder();
      bowl(b);
      heldBowl = b.mesh(actor.id + '_held_bowl');
      heldBowl.scale = [0.8, 0.8, 0.8];
      heldBowl.position = [0, 0.015, 0.045];
      hands[1].children.push(heldBowl);
    } else {
      for (const x of [-0.008, 0.008])
        utensils.rod([x, -0.04, -0.03], [x, 0.03, 0.2], 0.003, M.wood, 0.002);
    }
    utensilsGrip = node('utensil_grip');
    utensilsGrip.children.push(utensils.mesh('meal_utensils'));
    hands[0].children.push(utensilsGrip);
  }
  if (
    action === 'rescue' ||
    (actor.id === 'luchen' && state.sceneKey === 'mini_corridor_candle' && !walking)
  ) {
    held = candle(action === 'rescue');
    held.scale = [0.75, 0.75, 0.75];
    held.position = [0, 0.02, 0.03];
    hands[1].children.push(held);
  }
  root.animate = (t) => {
    body.scale[1] = 1 + (still || action === 'write' ? 0 : Math.sin(t * 1.6 + seed) * 0.002);
    body.position[1] = bodyY;
    body.rotation = [bodyPitch, 0, 0];
    head.rotation = [0, still ? 0 : Math.sin(t * 0.47 + seed) * 0.025, 0];
    hands.forEach((hand) => {
      hand.rotation = [0, 0, 0];
    });
    arms.forEach((_, i) => armPose(rig, i, -0.06, -0.09, (i ? -1 : 1) * 0.035));
    if (still) return;
    if (action === 'talk') {
      const gesture = Math.sin(Math.min(t, 4) * 1.3) ** 2 * ease(t, 0.5);
      armPose(rig, 0, -0.13, -0.15 - gesture * 0.55, 0.06 + gesture * 0.06);
      head.rotation[0] = Math.sin(t * 2.2) * 0.02;
    }
    if (walking || action === 'latch') {
      const stride = t * 5.2 + seed;
      const moving = ease(t, 0.25) * (1 - ease(t - duration + 0.5, 0.5));
      body.position[1] += Math.abs(Math.sin(stride)) * 0.015 * moving;
      body.rotation[1] = Math.sin(stride) * 0.025 * moving;
      legs.forEach((leg, i) => {
        const cycle = stride + i * Math.PI;
        leg.rotation[0] = Math.sin(cycle) * 0.3 * moving;
        bend(leg, knees[i], Math.max(0, Math.cos(cycle)) * 0.48 * moving);
        armPose(rig, i, -Math.sin(cycle) * 0.24 * moving, -0.15);
      });
    }
    dayAction(rig, action, t, seed);
    if (action !== 'latch' || t >= duration)
      nightAction(rig, action, action === 'latch' ? t - duration : t, verse);
    const upright = -(body.rotation[0] + arms[1].rotation[0] + elbows[1].rotation[0]);
    if (held) held.rotation = [upright, 0, -arms[1].rotation[2]];
    if (heldBowl) heldBowl.rotation = [upright, 0, -arms[1].rotation[2]];
    if (utensilsGrip) {
      utensilsGrip.rotation = [
        -(body.rotation[0] + arms[0].rotation[0] + elbows[0].rotation[0]),
        0,
        -arms[0].rotation[2],
      ];
      const lift = mealLift(t, seed);
      utensilsGrip.children[0].rotation = [0.6 * (1 - lift), 2.5 * lift, 0];
    }
  };
  return { held, heldBowl, action };
}
