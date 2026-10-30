import type { V3 } from '@/scene/world/types';

export type Shape = { positions: number[]; normals: number[]; uv: number[]; indices: number[] };
const shape = (): Shape => ({ positions: [], normals: [], uv: [], indices: [] });

// Tidewater's GeoKit convention: meter-sized parts, Y up, local +Z forward.
export function box(w: number, h: number, d: number): Shape {
  const g = shape();
  const size = [w, h, d];
  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [-1, 1]) {
      const base = g.positions.length / 3;
      const a = (axis + 1) % 3,
        b = (axis + 2) % 3;
      for (const [u, v] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        const p = [0, 0, 0],
          n = [0, 0, 0];
        p[axis] = (sign * size[axis]) / 2;
        p[a] = (u * size[a]) / 2;
        p[b] = (v * size[b]) / 2;
        n[axis] = sign;
        g.positions.push(...p);
        g.normals.push(...n);
        g.uv.push((u + 1) / 2, (1 - v) / 2);
      }
      const ids = sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      g.indices.push(...ids.map((i) => base + i));
    }
  }
  return g;
}

export function sphere(r = 1, columns = 20, rows = 14): Shape {
  const g = shape();
  for (let y = 0; y <= rows; y++) {
    const phi = (y / rows) * Math.PI;
    for (let x = 0; x <= columns; x++) {
      const theta = (x / columns) * Math.PI * 2;
      const n = [Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)];
      g.positions.push(...n.map((v) => v * r));
      g.normals.push(...n);
      g.uv.push(x / columns, y / rows);
    }
  }
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x,
        b = a + columns + 1;
      g.indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  return g;
}

// Rotational profiles produce bowls, bells, roof finials, sleeves and pottery.
export function lathe(profile: [number, number][], segments = 24): Shape {
  const g = shape();
  for (let j = 0; j < profile.length; j++) {
    const prev = profile[Math.max(0, j - 1)],
      next = profile[Math.min(profile.length - 1, j + 1)];
    const dr = next[0] - prev[0],
      dy = next[1] - prev[1],
      len = Math.hypot(dr, dy) || 1;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        s = Math.sin(a),
        c = Math.cos(a);
      g.positions.push(profile[j][0] * s, profile[j][1], profile[j][0] * c);
      g.normals.push((dy / len) * s, -dr / len, (dy / len) * c);
      g.uv.push(i / segments, j / (profile.length - 1));
    }
  }
  for (let j = 0; j < profile.length - 1; j++)
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i,
        b = a + segments + 1;
      g.indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  return g;
}

export function cylinder(top: number, bottom: number, height: number, segments = 20): Shape {
  return lathe(
    [
      [0, -height / 2],
      [bottom, -height / 2],
      [top, height / 2],
      [0, height / 2],
    ],
    segments,
  );
}

export function torus(radius: number, tube: number, segments = 24): Shape {
  const g = shape(),
    sides = 8;
  for (let j = 0; j <= sides; j++)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        b = (j / sides) * Math.PI * 2;
      g.positions.push(
        (radius + tube * Math.cos(b)) * Math.cos(a),
        tube * Math.sin(b),
        (radius + tube * Math.cos(b)) * Math.sin(a),
      );
      g.normals.push(Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a));
      g.uv.push(i / segments, j / sides);
    }
  for (let j = 0; j < sides; j++)
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i,
        b = a + segments + 1;
      g.indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  return g;
}

export function plane(width: number, height: number): Shape {
  return {
    positions: [-width / 2, 0, 0, width / 2, 0, 0, width / 2, height, 0, -width / 2, height, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
    uv: [0, 1, 1, 1, 1, 0, 0, 0],
    indices: [0, 1, 2, 0, 2, 3],
  };
}

export function vector(x = 0, y = 0, z = 0): V3 {
  return [x, y, z];
}
