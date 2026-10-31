import { Builder } from '@/scene/geometry/builder';
import { sphere } from '@/scene/geometry/primitives';
import { node, type Geometry } from '@/scene/world/types';
import { roadNearest } from '@/scene/world_environment/road_path';
import { terrainHeight, templeClearance } from '@/scene/world_environment/terrain';
import { noise } from '@/scene/world_environment/terrain_noise';

const cache = new Map<boolean, Geometry>();
const petal = sphere(0.055, 6, 4);

/** Small scanned-style flower clusters to break up the grass belt at eye level. */
export function wildflowers(road: boolean) {
  let geometry = cache.get(road);
  if (!geometry) {
    const b = new Builder();
    let seed = road ? 1831 : 1637;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const flowers = [
      { stem: 0x3f613a, petal: 0xc9a96e },
      { stem: 0x466542, petal: 0xc87978 },
      { stem: 0x3c5d3c, petal: 0xb7a9ce },
    ];
    for (let patch = 0; patch < 180; patch++) {
      const x = road ? (random() - 0.5) * 160 : (random() < 0.5 ? -1 : 1) * (31 + random() * 27);
      const z = road ? 12 + random() * 165 : 8 - random() * 104;
      if (templeClearance(x, z) < 1.2 || (z > 11 && roadNearest(x, z).distance < 5.5)) continue;
      if (noise(x / 17 + 4, z / 18 - 3) < 0.38) continue;
      const y = terrainHeight(x, z, road);
      const kind = flowers[patch % flowers.length];
      const count = 3 + Math.floor(random() * 5);
      for (let i = 0; i < count; i++) {
        const px = x + (random() - 0.5) * 1.3,
          pz = z + (random() - 0.5) * 1.3,
          height = 0.22 + random() * 0.25;
        b.rod([px, y, pz], [px, y + height, pz], 0.009, {
          color: kind.stem,
          rough: 0.93,
          // Pattern 11 makes the renderer use the stem's local UV for the
          // wind mask, keeping each flower rooted even on high slopes.
          pattern: 11,
        });
        const angle = random() * Math.PI * 2;
        for (let petalIndex = 0; petalIndex < 5; petalIndex++) {
          const a = angle + (petalIndex * Math.PI * 2) / 5;
          b.add(
            petal,
            { color: kind.petal, rough: 0.78, pattern: 11 },
            [px + Math.cos(a) * 0.052, y + height, pz + Math.sin(a) * 0.052],
            [1, 0.72, 1],
          );
        }
        b.ball([0.045, 0.045, 0.045], [px, y + height, pz], {
          color: 0xd0b762,
          rough: 0.8,
          pattern: 11,
        });
      }
    }
    geometry = b.build();
    cache.set(road, geometry);
  }
  const result = node('wildflower_field', geometry);
  result.wind = 0.85;
  result.shadow = false;
  return result;
}
