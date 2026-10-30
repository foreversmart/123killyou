import { mat4, vec3 } from 'wgpu-matrix';
import { box, cylinder, sphere, type Shape } from '@/scene/geometry/primitives';
import { node, type Geometry, type Material, type V3, type WorldNode } from '@/scene/world/types';

export const PAT = { plain: 0, wood: 1, cloth: 2, skin: 3, stone: 4, bronze: 5, wax: 6, tile: 7 };
export const materials = {
  wood: { color: 0x544536, rough: 0.88, pattern: PAT.wood },
  darkWood: { color: 0x302a25, rough: 0.86, pattern: PAT.wood },
  redWood: { color: 0x793b30, rough: 0.8, pattern: PAT.wood },
  stone: { color: 0x8a8c7b, rough: 0.93, pattern: PAT.stone },
  plaster: { color: 0xc9c4ae, rough: 0.98, pattern: 10 },
  roof: { color: 0x414e47, rough: 0.78, pattern: PAT.tile },
  brass: { color: 0xb39250, rough: 0.38, metal: 0.72, pattern: PAT.bronze },
  paper: { color: 0xe6d5ad, rough: 0.95 },
  black: { color: 0x252622, rough: 0.86 },
} satisfies Record<string, Material>;

const linear = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

// As in Tidewater's prepare/mergePrepared: one interleaved vertex layout and a
// merged mesh per rigid part, with linear color + roughness/metalness/pattern.
export class Builder {
  private vertices: number[] = [];
  private indices: number[] = [];

  add(
    g: Shape,
    material: Material,
    position: V3 = [0, 0, 0],
    scale: V3 = [1, 1, 1],
    rotation: V3 = [0, 0, 0],
    tile = -1,
  ) {
    let matrix = mat4.translation(position);
    matrix = mat4.rotateY(matrix, rotation[1]);
    matrix = mat4.rotateX(matrix, rotation[0]);
    matrix = mat4.rotateZ(matrix, rotation[2]);
    matrix = mat4.scale(matrix, scale);
    const normalMatrix = mat4.transpose(mat4.inverse(matrix));
    const base = this.vertices.length / 16;
    const color = [
      linear((material.color >> 16) & 255),
      linear((material.color >> 8) & 255),
      linear(material.color & 255),
    ];
    for (let i = 0; i < g.positions.length / 3; i++) {
      const p = vec3.transformMat4(g.positions.slice(i * 3, i * 3 + 3), matrix);
      const n = vec3.normalize(
        vec3.transformMat4Upper3x3(g.normals.slice(i * 3, i * 3 + 3), normalMatrix),
      );
      this.vertices.push(
        ...p,
        ...n,
        ...color,
        material.rough ?? 0.7,
        material.metal ?? 0,
        material.pattern ?? 0,
        material.glow ?? 0,
        g.uv[i * 2],
        g.uv[i * 2 + 1],
        tile,
      );
    }
    for (const index of g.indices) this.indices.push(index + base);
    return this;
  }

  merge(geometry: Geometry, position: V3, rotation: V3 = [0, 0, 0]) {
    let matrix = mat4.translation(position);
    matrix = mat4.rotateY(matrix, rotation[1]);
    matrix = mat4.rotateX(matrix, rotation[0]);
    matrix = mat4.rotateZ(matrix, rotation[2]);
    const base = this.vertices.length / 16;
    for (let i = 0; i < geometry.vertices.length; i += 16) {
      const v = geometry.vertices.slice(i, i + 16);
      v.set(vec3.transformMat4(v.slice(0, 3), matrix));
      v.set(vec3.transformMat4Upper3x3(v.slice(3, 6), matrix), 3);
      this.vertices.push(...v);
    }
    for (const index of geometry.indices) this.indices.push(index + base);
    return this;
  }

  box(size: V3, position: V3, material: Material = materials.wood, rotation: V3 = [0, 0, 0]) {
    return this.add(box(...size), material, position, [1, 1, 1], rotation);
  }

  ball(size: V3, position: V3, material: Material, rotation: V3 = [0, 0, 0]) {
    return this.add(sphere(), material, position, size, rotation);
  }

  rod(a: V3, b: V3, radius: number, material: Material, endRadius = radius) {
    const delta = vec3.subtract(b, a),
      length = vec3.length(delta);
    const position = vec3.mulScalar(vec3.add(a, b), 0.5) as unknown as V3;
    const rotation: V3 = [Math.acos(delta[1] / length), Math.atan2(delta[0], delta[2]), 0];
    return this.add(
      cylinder(endRadius, radius, length, 12),
      material,
      position,
      [1, 1, 1],
      rotation,
    );
  }

  build(): Geometry {
    return { vertices: new Float32Array(this.vertices), indices: new Uint32Array(this.indices) };
  }
  mesh(name: string): WorldNode {
    return node(name, this.build());
  }
}
