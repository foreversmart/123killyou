import { Builder } from '@/scene/geometry/builder';
import { type Identity } from '@/scene/world_character/identity';
import { node } from '@/scene/world/types';

export function characterHead(id: Identity, stone = false) {
  const head = node(id + '_head');
  head.position[1] = ['luchen', 'huipu', 'shangong'].includes(id) ? 1.52 : 1.57;
  const face = node('anatomical_face');
  face.asset = (id === 'huipu' ? 'luchen' : id) + '_head';
  if (stone) face.surface = 'stone';
  // Distinct cranial and jaw proportions keep the cast readable in profile.
  face.scale =
    id === 'xuzhi'
      ? [0.94, 0.97, 0.95]
      : id === 'huipu'
        ? [1.12, 1.04, 1.03]
        : id === 'shangong'
          ? [0.95, 1.08, 0.95]
          : [1, 1, 1];
  head.children.push(face);
  if (id === 'xuzhi') {
    const b = new Builder();
    const ribbon = { color: stone ? 0x74766c : 0x3e79ac, rough: 0.8 };
    b.ball([0.014, 0.024, 0.014], [0.107, -0.065, -0.065], ribbon);
    b.rod([0.106, -0.08, -0.063], [0.112, -0.17, -0.05], 0.005, ribbon);
    head.children.push(b.mesh('ribbon'));
  }
  return head;
}
