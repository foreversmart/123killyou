import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mat4 } from 'wgpu-matrix';
import { skinWorld } from './skinned_bind.mjs';
import { smoothSkinWeights } from './skinned_smoothing.mjs';

export async function rebindScan(vertices, indices, metadata, regions, sourceWeights) {
  const { matrices, parents } = skinWorld(metadata.nodes);
  const normalize = mat4.scaling([0.85, 0.85, 0.85]);
  normalize[13] = 0.85;
  const bones = metadata.joints.map((node) => {
    let parent = parents[node];
    while (parent >= 0 && !metadata.joints.includes(parent)) parent = parents[parent];
    return {
      name: metadata.nodes[node].name,
      parent: metadata.joints.indexOf(parent),
      matrix: Array.from(mat4.multiply(normalize, matrices.get(node))),
    };
  });
  if (sourceWeights) return smoothSkinWeights(vertices, indices, sourceWeights, regions, bones);
  const positions = [];
  for (let vertex = 0; vertex < vertices.length; vertex += 16)
    positions.push(...vertices.subarray(vertex, vertex + 3));
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'linlan_rebind_'));
  try {
    await writeFile(
      path.join(temporary, 'input.json'),
      JSON.stringify({ positions, indices: Array.from(indices), bones, regions }),
    );
    const blender = process.env.BLENDER_BIN || '/Applications/Blender.app/Contents/MacOS/Blender';
    const script = fileURLToPath(new URL('./rebind_scan.py', import.meta.url));
    execFileSync(
      blender,
      ['--background', '--python-exit-code', '1', '--python', script, '--', temporary],
      {
        stdio: 'inherit',
      },
    );
    const source = JSON.parse(await readFile(path.join(temporary, 'weights.json'), 'utf8'));
    return smoothSkinWeights(vertices, indices, source, regions, bones);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
