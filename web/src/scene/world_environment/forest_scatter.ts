import type { WorldNode } from '@/scene/world/types';
import { treeAsset, vegetationRandom } from '@/scene/world_environment/procedural_vegetation';
import { noise, smooth } from '@/scene/world_environment/terrain_noise';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { roadNearest } from '@/scene/world_environment/road_path';

type Crown = [number, number, number];

/** Tidewater's crown radii use a spatial occupancy grid instead of pairwise scans. */
export class CrownOccupancy {
  private cells = new Map<string, Crown[]>();

  add(x: number, z: number, radius: number) {
    const cx = Math.floor(x / 6),
      cz = Math.floor(z / 6);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++)
        for (const [px, pz, previousRadius] of this.cells.get(`${cx + dx}:${cz + dz}`) || [])
          if ((x - px) ** 2 + (z - pz) ** 2 < (radius + previousRadius) ** 2) return false;
    const key = `${cx}:${cz}`;
    let cell = this.cells.get(key);
    if (!cell) this.cells.set(key, (cell = []));
    cell.push([x, z, radius]);
    return true;
  }
}

/** Original 3.8 m jittered scatter, with mountain cover replacing island shore masks. */
export function forestTrees(
  distant: boolean,
  occupancy = new CrownOccupancy(),
  road = false,
): WorldNode[] {
  const random = vegetationRandom(distant ? 942 : 417);
  const candidates: [number, number][] = [];
  for (let z = distant ? -330 : -145; z < (distant ? 170 : 160); z += 3.8)
    for (let x = distant ? -275 : -135; x < (distant ? 275 : 135); x += 3.8)
      candidates.push([x + (random() - 0.5) * 3.4, z + (random() - 0.5) * 3.4]);
  // Randomizing the budgeted candidates keeps all ridges covered equally.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const trees: WorldNode[] = [];
  for (const [x, z] of candidates) {
    const distance = Math.hypot(x, z + 16);
    if (distance > (distant ? 355 : 157) || (distant && distance < 130)) continue;
    if (templeClearance(x, z) < 10) continue;
    const roadside = z > 10 && z < 175 && Math.abs(x) < 125;
    const roadDistance = roadside ? roadNearest(x, z).distance : Infinity;
    if (roadDistance < 11) continue;
    const cover = noise(x / 60, z / 60) * 0.6 + noise(x / 17 + 4, z / 17 - 3) * 0.4;
    const forest = smooth((cover - 0.23) / 0.35);
    const probability = forest > 0.5 ? 0.98 : smooth((forest - 0.15) / 0.35) * 0.42 + 0.01;
    if (random() > probability) continue;
    const y = terrainHeight(x, z, road);
    const slope = Math.hypot(terrainHeight(x + 2, z) - y, terrainHeight(x, z + 2) - y) / 2;
    if (slope > 1.35) continue;
    const subcanopy = forest > 0.5 && random() < 0.3;
    const scale =
      (subcanopy ? 0.55 + random() * 0.2 : 0.8 + random() * 0.5) * (forest > 0.5 ? 1 : 0.85);
    const vertical = 0.78 + random() * 0.34;
    if (!occupancy.add(x, z, Math.max(distant ? 2.1 : 2.15, 1.95 * scale))) continue;
    const tree = treeAsset(
      Math.floor(random() * 4),
      [x, y - 0.08, z],
      scale,
      random() * Math.PI * 2,
    );
    tree.scale[1] *= vertical;
    tree.shadow = !distant && (distance < 100 || roadDistance < 32);
    trees.push(tree);
    if (trees.length >= (distant ? 1300 : 700)) break;
  }
  return trees;
}
