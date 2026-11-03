import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { component } from './pack.mjs';

/** Run only the original CPU patch builders; no WebGPU objects are created. */
export async function loadGrassPatch(source) {
  const file = path.join(source, 'src/world/vegetation/GrassField.js');
  const text = await readFile(file, 'utf8');
  const start = text.indexOf('export const CELL =');
  const end = text.indexOf('export class GrassField');
  if (start < 0 || end <= start)
    throw new Error('Tidewater GrassField CPU builders could not be located.');
  const engine = pathToFileURL(path.join(source, 'src/engine/index.js')).href;
  const noise = pathToFileURL(path.join(source, 'src/util/Noise.js')).href;
  const module = [
    `import * as THREE from ${JSON.stringify(engine)};`,
    `import { mulberry32 } from ${JSON.stringify(noise)};`,
    text.slice(start, end),
    'export const patch = buildPatch(0, clumpParams(7), 7).build();',
  ].join('\n');
  const url = `data:text/javascript;base64,${Buffer.from(module).toString('base64')}`;
  return (await import(url)).patch;
}

/** Bake source slot positions and blade width without changing their topology. */
export function packGrass(geometry) {
  const attributes = geometry.attributes;
  const vertices = [];
  const indices = [];
  const used = new Map();
  const read = (name, vertex, axis) => component(attributes[name], vertex, axis);
  for (let triangle = 0; triangle < geometry.index.array.length; triangle += 3) {
    const source = geometry.index.array.subarray(triangle, triangle + 3);
    if ([...source].some((vertex) => read('aBlade', vertex, 1) !== 0)) continue;
    for (const vertex of source) {
      if (!used.has(vertex)) {
        used.set(vertex, vertices.length / 16);
        const rootX = read('aSlot', vertex, 0);
        const rootZ = read('aSlot', vertex, 1);
        const height = read('aBlade', vertex, 0);
        vertices.push(
          rootX + read('position', vertex, 0) * 1.35 + read('aSide', vertex, 0) * 1.5,
          read('position', vertex, 1) + read('aSide', vertex, 1) * 1.5,
          rootZ + read('position', vertex, 2) * 1.35 + read('aSide', vertex, 2) * 1.5,
          read('normal', vertex, 0),
          read('normal', vertex, 1),
          read('normal', vertex, 2),
          rootX,
          rootZ,
          read('aBlade', vertex, 2),
          height,
          read('aBlade', vertex, 3),
          140,
          1,
          read('aSide', vertex, 3),
          height,
          -2 - read('aSlot', vertex, 2),
        );
      }
      indices.push(used.get(vertex));
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}
