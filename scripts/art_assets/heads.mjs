import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TGALoader } from 'three/examples/jsm/loaders/TGALoader.js';
import { Matrix3, Texture, TextureLoader, Vector3 } from 'three';

async function buffer(file) {
  const bytes = await readFile(file);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function texture(file) {
  const { data, width, height } = new TGALoader().parse(await buffer(file));
  return sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

// FBX is an offline authoring format only. No Three.js code enters the game bundle.
export async function addHeads(lib, source) {
  globalThis.window = { URL: { createObjectURL: () => '' } };
  const originalLoad = TextureLoader.prototype.load;
  TextureLoader.prototype.load = () => new Texture();
  try {
    for (const [id, folder, prefix, hair] of [
      ['linlan', 'Female_Adult_05', 'f005', true],
      ['xuzhi', 'Female_Adult_08', 'f008', true],
      ['zhouyan', 'Male_Adult_02', 'm003', true],
      ['luchen', 'Male_Adult_14', 'm012', false],
      ['shangong', 'Male_Adult_03', 'm004', false],
    ]) {
      const directory = path.join(source, 'heads', folder);
      const scene = new FBXLoader().parse(await buffer(path.join(directory, folder + '.fbx')), '');
      scene.updateMatrixWorld(true);
      const skin = await lib.surface(
        id + '_skin',
        await texture(path.join(directory, prefix + '_head_color.tga')),
        await texture(path.join(directory, prefix + '_head_normal.tga')),
        undefined,
        0.66,
      );
      const strands = hair
        ? await lib.surface(
            id + '_hair',
            await texture(path.join(directory, prefix + '_opacity_color.tga')),
            undefined,
            undefined,
            0.85,
          )
        : null;
      const parts = [];
      let top = -Infinity,
        front = -Infinity,
        back = Infinity;
      scene.traverse((object) => {
        if (!object.isMesh) return;
        const geometry = object.geometry;
        const normalMatrix = new Matrix3().getNormalMatrix(object.matrixWorld);
        for (const group of geometry.groups) {
          const material = object.material[group.materialIndex].name;
          const skinPart = material.endsWith('_head');
          if (!skinPart && !(hair && material.endsWith('_opacity'))) continue;
          const positions = [],
            normals = [],
            uv = [];
          for (let n = group.start; n < group.start + group.count; n++) {
            const i = geometry.index ? geometry.index.getX(n) : n;
            const p = new Vector3()
              .fromBufferAttribute(geometry.attributes.position, i)
              .applyMatrix4(object.matrixWorld)
              .multiplyScalar(0.01);
            const normal = new Vector3()
              .fromBufferAttribute(geometry.attributes.normal, i)
              .applyMatrix3(normalMatrix)
              .normalize();
            positions.push(...p.toArray());
            normals.push(...normal.toArray());
            uv.push(geometry.attributes.uv.getX(i), 1 - geometry.attributes.uv.getY(i));
            if (skinPart) {
              top = Math.max(top, p.y);
              front = Math.max(front, p.z);
              back = Math.min(back, p.z);
            }
          }
          parts.push({
            surface: skinPart ? skin : strands,
            preserve: true,
            mesh: {
              positions: new Float32Array(positions),
              normals: new Float32Array(normals),
              uv: new Float32Array(uv),
              indices: Uint32Array.from({ length: positions.length / 3 }, (_, i) => i),
            },
          });
        }
      });
      lib.mesh(id + '_head', parts, 6000, (p) => [
        p[0],
        p[1] - top + 0.16,
        p[2] - (front + back) / 2,
      ]);
    }
  } finally {
    TextureLoader.prototype.load = originalLoad;
    delete globalThis.window;
  }
}
