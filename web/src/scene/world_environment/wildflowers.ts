import { node } from '@/scene/world/types';
import { roadNearest } from '@/scene/world_environment/road_path';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { noise } from '@/scene/world_environment/terrain_noise';
import { plantAsset, vegetationRandom } from '@/scene/world_environment/procedural_vegetation';

/** Tidewater heliconia and bird-of-paradise flowers among the sheltered understory. */
export function wildflowers(road: boolean) {
  const root = node('tidewater_flowering_understory');
  const random = vegetationRandom(1637);
  for (let patch = 0; patch < 140 && root.children.length < 30; patch++) {
    const x = (random() - 0.5) * 140;
    const z = -90 + random() * 230;
    if (templeClearance(x, z) < 2 || (z > 11 && roadNearest(x, z).distance < 7.2)) continue;
    if (noise(x / 17 + 4, z / 18 - 3) < 0.42) continue;
    const y = terrainHeight(x, z, road);
    const slope = Math.hypot(terrainHeight(x + 1, z) - y, terrainHeight(x, z + 1) - y);
    if (slope > 0.6) continue;
    root.children.push(
      plantAsset(
        patch % 3 === 0 ? 'strelitzia' : 'heliconia',
        [x, y - 0.025, z],
        0.65 + random() * 0.3,
        random() * Math.PI * 2,
      ),
    );
  }
  return root;
}
