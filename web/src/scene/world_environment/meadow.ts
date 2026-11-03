import { node } from '@/scene/world/types';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { roadSample, ROAD_LENGTH } from '@/scene/world_environment/road_path';
import { plantAsset, vegetationRandom } from '@/scene/world_environment/procedural_vegetation';

/** Original 8 m Tidewater grass cells, grounded and clipped per clump by the renderer. */
export function meadow(road: boolean) {
  const root = node(road ? 'road_tidewater_meadow' : 'gate_tidewater_meadow');
  const random = vegetationRandom(771);
  const cells = new Set<string>();
  const place = (centerX: number, centerZ: number) => {
    const x = Math.floor(centerX / 8) * 8;
    const z = Math.floor(centerZ / 8) * 8;
    const key = `${x}:${z}`;
    if (cells.has(key) || templeClearance(x + 4, z + 4) < -3) return;
    const y = terrainHeight(x + 4, z + 4, road);
    const grass = plantAsset('grass_patch', [x, y, z]);
    grass.vegetationGround = true;
    grass.vegetationRoad = road;
    grass.wind = 1;
    cells.add(key);
    root.children.push(grass);
  };
  for (let i = 0; i < 50; i++) {
    const frame = roadSample((i / 49) * ROAD_LENGTH);
    const offset = (i % 2 ? 1 : -1) * (7 + random() * 5);
    place(
      frame.position[0] + Math.cos(frame.yaw) * offset,
      frame.position[2] - Math.sin(frame.yaw) * offset,
    );
  }
  for (const side of [-1, 1])
    for (const z of [-4, -20, -36, -52, -68]) place(side * (36 + random() * 8), z);
  return root;
}
