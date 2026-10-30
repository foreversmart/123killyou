import { node, type WorldNode, type V3 } from '@/scene/world/types';

export function bendingJoint(limb: WorldNode, name: string, pivot: V3, tip: V3) {
  limb.bend = { pivot, angle: 0 };
  const joint = node(name);
  joint.position = [...pivot];
  const socket = node(name + '_socket');
  socket.position = [...tip];
  joint.children.push(socket);
  limb.children.push(joint);
  return { joint, socket };
}

export function bend(limb: WorldNode, joint: WorldNode, angle: number) {
  limb.bend!.angle = angle;
  joint.rotation[0] = angle;
}

export const ease = (time: number, duration = 1) => {
  const t = Math.max(0, Math.min(1, time / duration));
  return t * t * (3 - 2 * t);
};
