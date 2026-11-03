import { node } from '@/scene/world/types';
import type { CharacterRig } from '@/scene/world_character/model';
import { bendingJoint, bend } from '@/scene/world_character/joints';
import { identities } from '@/scene/world_character/identity';

/** Animation controls remain semantic; one continuous mesh receives their bone palette. */
export function skinnedCharacterModel(
  id: 'linlan' | 'luchen' | 'xuzhi' | 'huipu' | 'zhaoxi' | 'zhouyan',
  pose: CharacterRig['pose'],
): CharacterRig {
  const root = node(id);
  root.scale.fill(identities[id].height);
  const body = node('body');
  body.position[1] = pose === 'standing' ? 0.82 : pose === 'seated' ? 0.54 : 0.3;
  body.rotation[0] = pose === 'kneeling' ? 1.15 : 0;
  const head = node(id + '_head');
  head.position = [0, 0.75, 0];
  // Keep a non-rendering speech control; the source models do not expose a
  // separate jaw bone that the dialogue system could animate safely.
  const speech = node('speech_control');
  speech.bend = { pivot: [0, -0.045, 0.035], angle: 0 };
  head.children.push(speech);
  body.children.push(head);
  const mesh = node(id + '_skin');
  mesh.asset = id + '_model_skin';
  root.children.push(mesh, body);
  const arms = [],
    elbows = [],
    hands = [],
    legs = [],
    knees = [];
  for (const side of [-1, 1]) {
    const arm = node('arm');
    arm.position = [side * 0.215, 0.5, 0];
    const elbow = bendingJoint(arm, 'elbow', [0, -0.26, 0.035], [side * 0.002, -0.28, -0.005]);
    body.children.push(arm);
    arms.push(arm);
    elbows.push(elbow.joint);
    hands.push(elbow.socket);
    const leg = node('leg');
    leg.position = [side * 0.095, body.position[1], 0];
    leg.rotation[0] = pose === 'standing' ? 0 : pose === 'seated' ? -1.25 : -0.88;
    const knee = bendingJoint(leg, 'knee', [0, -0.38, 0.02], [0, -0.38, 0.05]);
    bend(leg, knee.joint, pose === 'standing' ? 0 : pose === 'seated' ? 1.25 : 2.4);
    root.children.push(leg);
    legs.push(leg);
    knees.push(knee.joint);
  }
  // Lin Lan carries a camera in the source scan. Lu Chen's model has no held
  // camera bone, so camera actions keep the ordinary hand controls and avoid
  // creating a phantom attachment.
  let camera: ReturnType<typeof node> | undefined;
  if (id === 'linlan') {
    camera = node('camera_control');
    camera.position = [0, 0.21, 0.23];
    body.children.push(camera);
  }
  const rig = {
    root,
    body,
    head,
    arms,
    elbows,
    hands,
    legs,
    knees,
    pose,
    ...(camera ? { camera } : {}),
  };
  root.skinTargets = { ...rig, mesh };
  return rig;
}
