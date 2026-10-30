import { Builder, materials as M } from '@/scene/geometry/builder';
import { node, type V3 } from '@/scene/world/types';

export function bodhisattva(position: V3) {
  const root = node('bodhisattva');
  root.position = position;
  const pedestal = new Builder();
  pedestal.box([1.95, 0.16, 1.65], [0, 0.08, 0], M.stone);
  pedestal.box([1.78, 0.26, 1.5], [0, 0.29, 0], M.darkWood);
  pedestal.box([1.9, 0.08, 1.62], [0, 0.46, 0], M.wood);
  for (const side of [-1, 1]) {
    pedestal.box([0.08, 0.26, 1.5], [side * 0.8, 0.29, 0], M.wood);
    pedestal.box([1.6, 0.055, 0.04], [0, 0.24, side * 0.76], M.wood);
  }
  root.children.push(pedestal.mesh('altar_pedestal'));
  const sculpture = node('scanned_guanyin');
  sculpture.asset = 'guanyin';
  sculpture.position[1] = 0.5;
  root.children.push(sculpture);
  return root;
}
