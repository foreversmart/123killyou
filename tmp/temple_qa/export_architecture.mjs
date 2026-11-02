import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHooks } from 'node:module';
import { mat4, vec3 } from 'wgpu-matrix';
import sharp from 'sharp';

const folder = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(folder, '../..');
registerHooks({ resolve(s, c, next) { return next(s.startsWith('@/') ? new URL('../../web/src/' + s.slice(2) + '.ts', import.meta.url).href : s, c); } });
const { Builder } = await import('../../web/src/scene/geometry/builder.ts');
const { templeEntrance } = await import('../../web/src/scene/world_environment/temple_entrance.ts');
const { hallShell } = await import('../../web/src/scene/world_environment/hall_shell.ts');
const { corridor } = await import('../../web/src/scene/world_environment/exterior.ts');
const { sceneLighting } = await import('../../web/src/scene/world/lighting.ts');
const { labels } = await import('../../web/src/scene/renderer/atlas.ts');
const hall = new Builder(); hallShell(hall, true);

for (const [id, label] of labels.entries()) {
  const room = id >= 2 && id <= 5;
  const bg = id < 2 ? '#33332b' : room ? '#5c5545' : '#d2bb8b';
  const border = id < 2 ? '#b19b65' : room ? '#827255' : '#7e6541';
  const ink = id < 2 ? '#e1c995' : room ? '#c1ae7d' : '#322f28';
  const svg = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="${bg}"/><rect x="10" y="10" width="236" height="236" fill="none" stroke="${border}" stroke-width="5"/><text x="128" y="132" dominant-baseline="central" text-anchor="middle" font-family="Songti SC,serif" font-size="${label.length<2?144:Math.min(88,224/label.length)}" font-weight="600" fill="${ink}">${label}</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(folder, `label_${id}.png`));
}

const configs = [
  { id: 'gate', root: templeEntrance(), place: 'gate', camera: [11, 5.8, 15], target: [0, 3.15, -2.1], lens: 39 },
  { id: 'hall', root: hall.mesh('hall_architecture'), place: 'hall', camera: [3.9, 2.7, 2.6], target: [-0.55, 3.6, -3.25], lens: 22 },
  { id: 'corridor', root: corridor(true), place: 'corridor', camera: [-2.3, 2.05, 5.5], target: [2.2, 2.45, -5.8], lens: 24 },
];
const metadata = [];
for (const config of configs) {
  let index = 0, triangles = 0;
  const meshes = [];
  function visit(node, parent = mat4.identity()) {
    let transform = mat4.translate(parent, node.position);
    transform = mat4.rotateY(transform, node.rotation[1]);
    transform = mat4.rotateX(transform, node.rotation[0]);
    transform = mat4.rotateZ(transform, node.rotation[2]);
    transform = mat4.scale(transform, node.scale);
    const normalTransform = mat4.transpose(mat4.inverse(transform));
    if (node.geometry && !node.shadowOnly) {
      const { vertices: input, indices } = node.geometry;
      const values = new Float32Array(input.length / 16 * 8);
      const materialIndices = new Uint16Array(input.length / 16);
      const materials = [], seen = new Map();
      for (let j = 0; j < input.length; j += 16) {
        if (!input.subarray(j,j+16).every(Number.isFinite)) throw new Error(`nonfinite ${config.id}:${node.name}:${j}`);
        const p = vec3.transformMat4(input.subarray(j,j+3), transform);
        const n = vec3.normalize(vec3.transformMat4Upper3x3(input.subarray(j+3,j+6), normalTransform));
        let uv = [input[j+13], input[j+14]];
        if (input[j+11] < 16 && input[j+15] < 0) {
          const a = Array.from(input.subarray(j+3,j+6)).map(Math.abs);
          uv = a[2] > a[0] && a[2] > a[1] ? [input[j], -input[j+1]] : a[0] > a[1] ? [input[j+2], -input[j+1]] : [input[j], input[j+2]];
          uv = uv.map(v => v * (input[j+11] === 1 ? 0.9 : 0.55));
        }
        values.set([p[0], -p[2], p[1], n[0], -n[2], n[1], uv[0], 1-uv[1]], j / 2);
        const mat = [...input.subarray(j+6,j+13), input[j+15]];
        const key = mat.join(','); if (!seen.has(key)) { seen.set(key,materials.length);materials.push(mat); }
        materialIndices[j/16] = seen.get(key);
      }
      const id = `${config.id}_${index++}`;
      fs.writeFileSync(path.join(folder,id+'_vertices.bin'),Buffer.from(values.buffer));
      fs.writeFileSync(path.join(folder,id+'_indices.bin'),Buffer.from(indices.buffer,indices.byteOffset,indices.byteLength));
      fs.writeFileSync(path.join(folder,id+'_materials.bin'),Buffer.from(materialIndices.buffer));
      triangles += indices.length/3;
      meshes.push({ id, name:node.name, materials });
    }
    node.children.forEach(child=>visit(child,transform));
  }
  visit(config.root);
  const lighting=sceneLighting({flags:{},sceneKey:'mini_arrival'},config.place,true);
  metadata.push({id:config.id,meshes,camera:config.camera,target:config.target,lens:config.lens,lighting});
  console.log(`${config.id}: ${triangles} triangles, ${meshes.length} meshes`);
}
fs.writeFileSync(path.join(folder,'architecture.json'),JSON.stringify({project,scenes:metadata},null,2));
