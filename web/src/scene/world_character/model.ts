import { Builder } from '@/scene/geometry/builder';
import { cylinder } from '@/scene/geometry/primitives';
import { garment } from '@/scene/geometry/garment';
import { identities, type Identity } from '@/scene/world_character/identity';
import { characterHead } from '@/scene/world_character/head';
import { accessories } from '@/scene/world_character/accessories';
import { characterDetails } from '@/scene/world_character/details';
import { bendingJoint, bend } from '@/scene/world_character/joints';
import { node, type Material, type WorldNode } from '@/scene/world/types';

export type CharacterRig = {
  root: WorldNode;
  body: WorldNode;
  head: WorldNode;
  arms: WorldNode[];
  legs: WorldNode[];
  elbows: WorldNode[];
  hands: WorldNode[];
  knees: WorldNode[];
  pose: 'standing' | 'seated' | 'kneeling';
};

export function characterModel(
  id: Identity,
  pose: 'standing' | 'seated' | 'kneeling' = 'standing',
  stone = false,
): CharacterRig {
  const look = identities[id],
    monk = ['luchen', 'huipu', 'shangong'].includes(id);
  const cloth: Material = {
    color: stone ? 0x787b70 : look.coat,
    rough: 0.92,
    pattern: stone ? 4 : 2,
  };
  const shirt: Material = { ...cloth, color: stone ? 0x85877b : look.shirt };
  const pants: Material = { ...cloth, color: stone ? 0x777a70 : look.trousers };
  const skin: Material = {
    color: stone ? 0x8c8c7d : look.skin,
    rough: 0.62,
    pattern: stone ? 4 : 3,
  };
  const root = node(id),
    body = node('body'),
    b = new Builder();
  root.scale = [look.height, look.height, look.height];
  root.children.push(body);
  b.add(cylinder(0.054, 0.062, 0.1), skin, [0, 1.375, 0.005]);
  if (monk) {
    b.add(
      garment(
        [
          [pose === 'standing' ? 0.23 : 0.44, 0.25, 0.16, pose === 'standing' ? 0 : 0.18],
          [pose === 'standing' ? 0.3 : 0.53, 0.25, 0.16, pose === 'standing' ? 0 : 0.24],
          [0.67, 0.23, 0.14, pose === 'standing' ? 0 : 0.18],
          [0.87, 0.19, 0.13],
          [1.1, 0.17, 0.115],
          [1.28, 0.195, 0.12],
          [1.36, 0.09, 0.065],
        ],
        0.007,
      ),
      cloth,
    );
    b.add(
      garment(
        [
          [0.94, 0.18, 0.139],
          [0.98, 0.18, 0.139],
          [1.01, 0.177, 0.135],
        ],
        0.002,
      ),
      { ...cloth, color: 0x3c3831 },
    );
    b.box([0.055, 0.26, 0.025], [0.13, 0.82, 0.145], { ...cloth, color: 0x423c34 });
    if (id === 'huipu')
      b.box([0.17, 0.92, 0.04], [0.14, 0.93, 0.145], { ...cloth, color: 0x574638 }, [0, 0, 0.08]);
  }
  if (monk) body.children.push(b.mesh('torso'));
  else {
    const torso = node('torso');
    torso.asset = id + '_torso';
    body.children.push(torso, accessories(id));
  }
  body.children.push(characterDetails(id, monk, cloth, shirt));
  const head = characterHead(id, stone);
  body.children.push(head);
  const arms: WorldNode[] = [],
    legs: WorldNode[] = [],
    elbows: WorldNode[] = [],
    hands: WorldNode[] = [],
    knees: WorldNode[] = [];
  for (const side of [-1, 1]) {
    const arm = new Builder();
    arm.add(
      garment(
        [
          [-0.48, monk ? 0.065 : 0.039, monk ? 0.055 : 0.033, 0.07],
          [-0.4, monk ? 0.08 : 0.046, 0.047, 0.065],
          [-0.28, 0.057, 0.055, 0.035],
          [-0.17, 0.061, 0.059, 0.015],
          [-0.06, 0.065, 0.066],
          [0.015, 0.025, 0.03],
        ],
        0.003,
      ),
      cloth,
    );
    const a = arm.mesh('arm');
    if (!monk) {
      a.geometry = undefined;
      a.asset = id + (side < 0 ? '_right_arm' : '_left_arm');
    }
    a.position = [side * 0.215, 1.32, 0];
    body.children.push(a);
    arms.push(a);
    const female = id === 'linlan' || id === 'xuzhi';
    const elbow = bendingJoint(
      a,
      'elbow',
      [0, -0.26, 0.035],
      female ? [side * 0.002, -0.28, -0.005] : [side * 0.035, -0.29, 0.01],
    );
    elbows.push(elbow.joint);
    hands.push(elbow.socket);
    if (monk) {
      const hand = node('anatomical_hand');
      hand.asset = side < 0 ? 'hand_right' : 'hand_left';
      if (stone) hand.surface = 'stone';
      elbow.socket.children.push(hand);
    }
    const leg = new Builder();
    leg.add(
      garment(
        [
          [-0.73, 0.049, 0.043, 0.02],
          [-0.65, 0.054, 0.047, 0.016],
          [-0.48, 0.061, 0.053, 0.01],
          [-0.36, 0.059, 0.061, 0.02],
          [-0.18, 0.076, 0.07],
          [0.01, 0.085, 0.082],
        ],
        0.004,
      ),
      pants,
    );
    leg.ball([0.065, 0.045, 0.12], [0, -0.76, 0.07], {
      color: id === 'xuzhi' ? 0xb8b7a6 : 0x3e3b31,
      rough: 0.84,
    });
    const l = leg.mesh(pose === 'kneeling' ? 'kneeling_leg' : 'leg');
    if (!monk) {
      l.geometry = undefined;
      l.asset = id + (side < 0 ? '_right_leg' : '_left_leg');
    }
    l.position = [side * 0.095, 0.82, 0];
    root.children.push(l);
    legs.push(l);
    knees.push(bendingJoint(l, 'knee', [0, -0.38, 0.02], [0, -0.38, 0.05]).joint);
  }
  // Rotate the torso about the hips, not the floor. All existing mesh coordinates
  // remain in meters; only their common parent moves to the anatomical pivot.
  for (const child of body.children) child.position[1] -= 0.82;
  body.position[1] = 0.82;
  if (pose === 'kneeling') {
    body.position[1] = 0.3;
    body.rotation[0] = 1.15;
    legs.forEach((l, i) => {
      l.position[1] = 0.3;
      l.rotation[0] = -0.88;
      bend(l, knees[i], 2.4);
    });
  }
  if (pose === 'seated') {
    body.position[1] = 0.54;
    legs.forEach((l, i) => {
      l.position[1] = 0.54;
      l.rotation[0] = -1.25;
      bend(l, knees[i], 1.25);
    });
  }
  return { root, body, head, arms, legs, elbows, hands, knees, pose };
}
