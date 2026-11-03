import type { CharacterRig } from '@/scene/world_character/model';
import type { Performance } from '@/scene/world_character/performance';
import { armPose, reachHand } from '@/scene/world_character/day_actions';
import { bend, ease } from '@/scene/world_character/joints';
import { HEAD_MOTION_RATE } from '@/scene/world_character/motion_rates';
import { bedsideAction } from '@/scene/world_character/bedside_action';

export function nightAction(rig: CharacterRig, action: Performance, t: number, verse: number) {
  const { head, body } = rig;
  if (action === 'bedside_work' || action === 'bedside_startled')
    bedsideAction(rig, t, action === 'bedside_startled');
  if (action === 'lean' || action === 'startled') {
    armPose(rig, 0, -0.65, -0.32, 0.12);
    armPose(rig, 1, -0.65, -0.32, -0.12);
    head.rotation[0] = 0.22;
    if (action === 'startled') head.rotation[1] = -0.85 * ease(t - 0.18, 0.7);
  }
  if (action === 'latch') {
    head.rotation[1] = -0.5 * ease(t, 0.8);
    reachHand(rig, 1, -0.18, 0.12 + 0.24 * ease(t, 0.9));
  }
  if (action === 'uneasy') {
    head.rotation[1] = 0.15;
    armPose(rig, 0, -0.25, -0.5, 0.08);
  }
  if (action === 'scratch' || action === 'frenzy') {
    const intensity = action === 'frenzy' ? 1 : Math.max(0.08, 0.8 - verse * 0.23);
    const pulse = Math.sin(t * 13) * 0.065 * intensity;
    // Both supplied characters and the fallback rig use a two-stage rigid
    // forearm bend. Deep folds made the sleeve cross the torso and revealed
    // the shoulder/elbow seam, so keep the frantic motion within a readable
    // human range while retaining the asymmetric scratching rhythm.
    armPose(rig, 0, -0.33, -1.48 + pulse, 0.2);
    armPose(rig, 1, -0.32, -1.34 - pulse, -0.2);
    head.rotation[2] = Math.sin(t * 7 * HEAD_MOTION_RATE) * intensity * 0.025;
    head.rotation[0] = verse * 0.035;
    body.rotation[2] = Math.sin(t * 6.3) * intensity * 0.012;
  }
  if (action === 'calm') {
    const settle = ease(t, 1.35);
    body.position[1] = 0.82 - 0.52 * settle;
    body.rotation[0] = 1.15 * settle;
    rig.legs.forEach((leg, i) => {
      leg.position[1] = body.position[1];
      leg.rotation[0] = -0.88 * settle;
      bend(leg, rig.knees[i], 2.4 * settle);
    });
    head.rotation[0] = 0.18 * settle;
    armPose(rig, 0, -0.06 - 0.84 * settle, -0.09 - 0.71 * settle, 0.15);
    armPose(rig, 1, -0.06 - 0.84 * settle, -0.09 - 0.71 * settle, -0.15);
  }
}
