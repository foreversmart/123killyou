import type { CharacterRig } from '@/scene/world_character/model';
import type { GameState, SceneActor } from '@/shared/types/game';
import { Builder, materials as M } from '@/scene/geometry/builder';
import { candle } from '@/scene/world_prop/ritual';
import { bowl } from '@/scene/world_prop/household';
import { node, type WorldNode } from '@/scene/world/types';
import { performanceFor } from '@/scene/world_character/performance';
import {
  dayAction,
  armPose,
  mealLift,
  mealUtensilOffset,
  mealUtensilRotation,
} from '@/scene/world_character/day_actions';
import { nightAction } from '@/scene/world_character/night_actions';
import { bend, ease } from '@/scene/world_character/joints';
import { speechMotion } from '@/scene/world_character/speech';

// Keep the gait cadence independent of the route duration. The old stride was
// derived from eased progress, which made the feet slow down with the root and
// read as a sliding translation on the longer gate approach. A steady cadence
// lets the body cover a larger scene distance while the two legs alternate.
const WALK_CYCLE_RATE = 5.8;

export function animateCharacter(
  rig: CharacterRig,
  actor: SceneActor,
  state: GameState,
  options: {
    walkDuration?: number;
    traveling?: boolean;
    alighting?: boolean;
    /** Keep a visible alternating step while an authored tableau drifts. */
    gaiting?: boolean;
    speaker?: () => string;
  } = {},
) {
  const { root, body, head, arms, legs, elbows, hands, knees } = rig;
  const legBasePositions = legs.map((leg) => [...leg.position] as [number, number, number]);
  const action = performanceFor(actor, state, options.traveling, options.alighting);
  const duration = options.walkDuration || 0;
  const speak = speechMotion(rig, actor, options.speaker || (() => ''));
  const seed = [...actor.id].reduce((n, letter) => n + letter.charCodeAt(0), 0) * 0.13;
  const bodyY = body.position[1],
    bodyPitch = body.rotation[0];
  const verse = Number(state.shotKey?.match(/double_scripture_(\d)/)?.[1] || 0);
  const still = action === 'stone' || action === 'still';
  let held: WorldNode | undefined;
  let heldBowl: WorldNode | undefined;
  let utensilsGrip: WorldNode | undefined;
  let heldBread: WorldNode | undefined;
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
    // Hold one small wooden spoon with a relaxed pinch. The old two-rod
    // placeholder read as rigid chopsticks and made the hand twist unnaturally.
    utensils.rod([0, -0.09, -0.05], [0, 0.11, 0.13], 0.008, M.wood, 0.006);
    utensils.ball([0.028, 0.014, 0.042], [0, 0.13, 0.16], M.wood);
    if (state.flags['meal_' + actor.id + '_ate']) {
      const b = new Builder();
      bowl(b);
      heldBowl = b.mesh(actor.id + '_held_bowl');
      heldBowl.scale = [0.72, 0.72, 0.72];
      heldBowl.position = [0, 0.008, 0.04];
      hands[1].children.push(heldBowl);
    } else {
      heldBread = new Builder()
        .ball([0.055, 0.04, 0.05], [0, 0.045, 0.03], { color: 0xeadcbc, rough: 0.95 })
        .mesh('held_bread');
      hands[1].children.push(heldBread);
    }
    utensilsGrip = node('utensil_grip');
    utensilsGrip.children.push(utensils.mesh('meal_utensils'));
    hands[0].children.push(utensilsGrip);
  }
  if (
    action === 'rescue' ||
    (actor.id === 'luchen' && state.sceneKey === 'mini_corridor_candle' && !options.traveling)
  ) {
    held = candle(action === 'rescue');
    held.scale = [0.75, 0.75, 0.75];
    held.position = [0, 0.02, 0.03];
    hands[1].children.push(held);
  }
  root.animate = (t, delta) => {
    const moving = duration > 0 && t < duration;
    const currentAction = moving ? 'walk' : action === 'walk' ? 'idle' : action;
    const actionTime = Math.max(0, t - duration);
    body.scale[1] = 1 + (still || action === 'write' ? 0 : Math.sin(t * 1.6 + seed) * 0.002);
    body.position[1] = bodyY;
    body.rotation = [bodyPitch, 0, 0];
    head.rotation = [0, still ? 0 : Math.sin(t * 0.47 + seed) * 0.025, 0];
    hands.forEach((hand) => {
      hand.rotation = [0, 0, 0];
    });
    arms.forEach((arm, i) => {
      arm.rotation[1] = 0;
      armPose(rig, i, -0.06, -0.09, (i ? -1 : 1) * 0.035);
    });
    // Always settle the lower body before applying the current gait. This is
    // important when a transition ends between frames: a final lifted foot
    // must return to the authored standing pose before the next scene starts.
    legs.forEach((leg, i) => {
      leg.position = [...legBasePositions[i]];
      leg.rotation[0] = 0;
      bend(leg, knees[i], 0);
    });
    if (still) return;
    if (duration > 0 || (options.gaiting && root.gaitMoving)) {
      const stride = t * WALK_CYCLE_RATE + seed;
      const weight = duration > 0 ? ease(t, 0.25) * (1 - ease(t - duration + 0.5, 0.5)) : 0.78;
      body.position[1] += Math.abs(Math.sin(stride)) * 0.035 * weight;
      body.rotation[1] = Math.sin(stride) * 0.055 * weight;
      legs.forEach((leg, i) => {
        const cycle = stride + i * Math.PI;
        const step = Math.sin(cycle);
        const lift = Math.max(0, step);
        // Opposite phase gives each foot a planted/swinging pair. Move the
        // whole leg through a short forward arc as it leaves the ground, then
        // bend the knee underneath it. The old pose only rotated the upper
        // mesh by a few degrees, which was easy to miss in the wide gate shot
        // and made the character read as a sliding root translation.
        leg.position[1] += lift * 0.055 * weight;
        leg.position[2] += step * 0.12 * weight;
        leg.rotation[0] = step * 0.62 * weight;
        bend(leg, knees[i], lift * 1.02 * weight);
        armPose(rig, i, -Math.sin(cycle) * 0.3 * weight, -0.15);
      });
    }
    dayAction(
      rig,
      currentAction,
      actionTime,
      seed,
      state.sceneKey === 'mini_register' &&
        ['register_desk', 'register_drag_mark'].includes(state.shotKey || ''),
    );
    nightAction(rig, currentAction, actionTime, verse);
    speak(currentAction, delta);
    const upright = -(body.rotation[0] + arms[1].rotation[0] + elbows[1].rotation[0]);
    if (held) held.rotation = [upright, 0, -arms[1].rotation[2]];
    if (heldBowl) heldBowl.rotation = [upright, 0, -arms[1].rotation[2]];
    if (heldBread) heldBread.rotation = [upright, 0, -arms[1].rotation[2]];
    if (utensilsGrip) {
      const lift = mealLift(actionTime, seed);
      utensilsGrip.position = mealUtensilOffset(lift, actionTime);
      utensilsGrip.rotation = [
        -(body.rotation[0] + arms[0].rotation[0] + elbows[0].rotation[0]),
        0,
        -arms[0].rotation[2],
      ];
      // Keep the spoon angled toward the bowl and lift it only through the
      // forearm, instead of spinning it around the wrist.
      utensilsGrip.children[0].rotation = mealUtensilRotation(lift, actionTime);
    }
  };
  return { held, heldBowl, action };
}
