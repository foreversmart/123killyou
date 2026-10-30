import { Builder } from '@/scene/geometry/builder';
import type { Shape } from '@/scene/geometry/primitives';

const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
const hash = (x: number, z: number) => {
  const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function noise(x: number, z: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    u = smooth(x - ix),
    v = smooth(z - iz);
  const a = hash(ix, iz) * (1 - u) + hash(ix + 1, iz) * u;
  const b = hash(ix, iz + 1) * (1 - u) + hash(ix + 1, iz + 1) * u;
  return a * (1 - v) + b * v;
}

// The courtyard and winding approach remain level. Hills grow beyond the playable footprint.
export function terrainHeight(x: number, z: number, road = false) {
  const border = road
    ? Math.abs(x - Math.sin(z * 0.035) * 4) - 4.2
    : Math.max(Math.abs(x) - 8.8, -z - 14, z - 13);
  const blend = smooth(border / 9);
  const ridge =
    noise(x * 0.033 + 17, z * 0.031 + 4) * 0.62 +
    noise(x * 0.077, z * 0.076) * 0.25 +
    noise(x * 0.19, z * 0.19) * 0.13;
  const mountain = smooth((-z - 26) / 55) * (10 + ridge * 27);
  return -0.16 + blend * (ridge * 4.4 + mountain) + blend * noise(x * 1.4, z * 1.4) * 0.1;
}

export function landscape(b: Builder, road = false) {
  const g: Shape = { positions: [], normals: [], uv: [], indices: [] };
  const columns = 112,
    rows = 144;
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= columns; i++) {
      const x = -85 + (i / columns) * 170,
        z = 30 - (j / rows) * 180;
      const dx = terrainHeight(x - 0.15, z, road) - terrainHeight(x + 0.15, z, road);
      const dz = terrainHeight(x, z - 0.15, road) - terrainHeight(x, z + 0.15, road);
      const length = Math.hypot(dx, 0.3, dz);
      g.positions.push(x, terrainHeight(x, z, road), z);
      g.normals.push(dx / length, 0.3 / length, dz / length);
      g.uv.push(x * 0.4, z * 0.4);
      if (i < columns && j < rows) {
        const a = j * (columns + 1) + i,
          c = a + columns + 1;
        g.indices.push(a, a + 1, c, a + 1, c + 1, c);
      }
    }
  b.add(g, { color: 0xc5c9b5, rough: 1, pattern: 9 });
}
