import type { V3 } from '@/scene/world/types';
import { ease } from '@/scene/world_character/joints';

export type FlockMember = {
  id: string;
  from: V3;
  to: V3;
  trailDistance: number;
  lateralBias: number;
  seed: number;
};

export type FlockMotion = {
  members: FlockMember[];
  leaderId: string;
};

/**
 * Build the loose procession used between the gate and registration room.
 * Each member has a different seed, side preference and trail distance so
 * their paths stay readable without becoming a fixed line.
 */
export function createRegisterFlockMotion(endZ: number): FlockMotion {
  const formation: Record<string, Omit<FlockMember, 'id'>> = {
    luchen: {
      from: [0, 0, 5.4],
      to: [0, 0, endZ],
      trailDistance: 0,
      lateralBias: 0,
      seed: 0.35,
    },
    linlan: {
      from: [-0.55, 0, 6.05],
      to: [-0.55, 0, endZ + 0.65],
      trailDistance: 0.65,
      lateralBias: -0.55,
      seed: 1.15,
    },
    zhouyan: {
      from: [0.34, 0, 6.35],
      to: [0.38, 0, endZ + 0.95],
      trailDistance: 0.95,
      lateralBias: 0.34,
      seed: 2.7,
    },
    xuzhi: {
      from: [0.72, 0, 6.85],
      to: [0.7, 0, endZ + 1.15],
      trailDistance: 1.45,
      lateralBias: 0.72,
      seed: 4.4,
    },
  };
  return {
    leaderId: 'luchen',
    members: Object.entries(formation).map(([id, member]) => ({ id, ...member })),
  };
}

export function registerFlockStartPosition(flock: FlockMotion, actorId: string): V3 | undefined {
  const member = flock.members.find((candidate) => candidate.id === actorId);
  return member ? [...member.from] : undefined;
}

export function registerFlockTargetPosition(flock: FlockMotion, actorId: string): V3 | undefined {
  const member = flock.members.find((candidate) => candidate.id === actorId);
  return member ? [...member.to] : undefined;
}

function trajectory(member: FlockMember, progress: number): V3 {
  return [
    member.from[0] + (member.to[0] - member.from[0]) * progress,
    member.from[1],
    member.from[2] + (member.to[2] - member.from[2]) * progress,
  ];
}

export function flockMemberPosition(
  flock: FlockMotion,
  actorId: string,
  time: number,
  duration: number,
): V3 {
  const members = flock.members;
  const leader = members.find((member) => member.id === flock.leaderId) || members[0];
  const progress = ease(time, duration);
  const leaderAt = (value: number) => trajectory(leader, value);
  const member = members.find((candidate) => candidate.id === actorId) || leader;
  if (member.id === leader.id) return leaderAt(progress);

  const routeLength = Math.abs(leader.to[2] - leader.from[2]);
  const lag = Math.min(0.075, (member.trailDistance / Math.max(routeLength, 1)) * 0.72);
  const followProgress = Math.max(0, Math.min(1, progress - lag * Math.sin(Math.PI * progress)));
  const anchor = leaderAt(followProgress);
  const wander = Math.sin(progress * Math.PI);
  const sideNoise =
    Math.sin(time * 0.72 + member.seed) * 0.12 + Math.sin(time * 1.31 + member.seed * 1.7) * 0.07;
  const depthNoise =
    Math.sin(time * 0.61 + member.seed * 0.8) * 0.07 +
    Math.sin(time * 1.17 + member.seed * 1.4) * 0.04;
  const raw: V3[] = members.map((candidate) => {
    if (candidate.id === leader.id) return leaderAt(progress);
    const candidateLag = Math.min(
      0.075,
      (candidate.trailDistance / Math.max(routeLength, 1)) * 0.72,
    );
    const candidateProgress = Math.max(
      0,
      Math.min(1, progress - candidateLag * Math.sin(Math.PI * progress)),
    );
    const point = leaderAt(candidateProgress);
    return [point[0] + candidate.lateralBias, point[1], point[2] + candidate.trailDistance];
  });
  const memberIndex = members.findIndex((candidate) => candidate.id === member.id);
  const own = raw[memberIndex] || [anchor[0] + member.lateralBias, member.from[1], anchor[2]];
  let separationX = 0;
  let separationZ = 0;
  for (let index = 0; index < raw.length; index++) {
    if (index === memberIndex) continue;
    const other = raw[index];
    const dx = own[0] - other[0];
    const dz = own[2] - other[2];
    const distance = Math.hypot(dx, dz);
    if (distance > 0 && distance < 0.95) {
      const force = (0.95 - distance) / 0.95;
      separationX += (dx / distance) * force * 0.2;
      separationZ += (dz / distance) * force * 0.2;
    }
  }
  const center = raw.reduce((sum, point) => [sum[0] + point[0], 0, sum[2] + point[2]] as V3, [
    0, 0, 0,
  ] as V3);
  center[0] /= raw.length;
  center[2] /= raw.length;
  const cohesionX = (center[0] - own[0]) * 0.055;
  const cohesionZ = (center[2] - own[2]) * 0.018;
  const aligned = leaderAt(Math.min(1, followProgress + 0.06));
  const alignmentX = (aligned[0] - anchor[0]) * 0.12;
  const alignmentZ = (aligned[2] - anchor[2]) * 0.08;
  const desired: V3 = [
    own[0] + sideNoise * wander + (cohesionX + separationX + alignmentX) * wander,
    member.from[1],
    own[2] + depthNoise * wander + (cohesionZ + separationZ + alignmentZ) * wander,
  ];
  const settle = ease(progress - 0.82, 0.18);
  return [
    desired[0] + (member.to[0] - desired[0]) * settle,
    desired[1],
    desired[2] + (member.to[2] - desired[2]) * settle,
  ];
}
