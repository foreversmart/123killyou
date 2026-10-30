import { terrainHeight } from '@/scene/world_environment/terrain';
import { node, type Geometry } from '@/scene/world/types';

const cache = new Map<boolean, Geometry>();
export function meadow(road: boolean) {
  if (!cache.has(road)) {
    const vertices: number[] = [],
      indices: number[] = [];
    let seed = 771;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let clump = 0; clump < 36000; clump++) {
      const z = 14 - random() * 63,
        side = clump % 2 ? 1 : -1;
      const x = side * ((road ? 4.5 : 8.9) + random() * 18) + (road ? Math.sin(z * 0.035) * 4 : 0);
      const y = terrainHeight(x, z, road);
      const patch = Math.sin(x * 0.7) * Math.cos(z * 0.31);
      if (patch < -0.65) continue;
      for (let blade = 0; blade < 4; blade++) {
        const angle = random() * Math.PI * 2,
          height = 0.09 + random() * 0.29;
        const width = 0.01 + random() * 0.01,
          lean = 0.08 + random() * 0.18;
        const sx = Math.cos(angle),
          sz = Math.sin(angle),
          base = vertices.length / 16;
        const tone = 0.75 + random() * 0.6;
        for (let row = 0; row < 3; row++)
          for (const edge of [-1, 1]) {
            const t = row / 2,
              w = width * (1 - t);
            vertices.push(
              x + Math.sin(blade * 2.4) * 0.09 + sx * edge * w + sz * t * t * lean,
              y + height * t,
              z + Math.cos(blade * 2.4) * 0.09 + sz * edge * w - sx * t * t * lean,
              sz * 0.75,
              0.65,
              -sx * 0.75,
              0.065 * tone * (0.6 + t * 0.4),
              0.095 * tone,
              0.022 * tone,
              0.9,
              0,
              11,
              0,
              (edge + 1) / 2,
              t,
              -1,
            );
            if (row < 2 && edge === -1) {
              const a = base + row * 2;
              indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
            }
          }
      }
    }
    cache.set(road, { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) });
  }
  const result = node('meadow_blades', cache.get(road));
  result.wind = 1.35;
  return result;
}
