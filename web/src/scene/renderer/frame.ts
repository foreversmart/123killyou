import { mat4, vec3 } from 'wgpu-matrix';
import type { CameraShot, Lighting, V3 } from '@/scene/world/types';

export const SHADOW_MAP_SIZE = 2048;

export function cameraMatrix(camera: CameraShot, aspect: number, offset: V3 = [0, 0, 0]) {
  const eye = vec3.add(camera.eye, offset),
    target = vec3.add(camera.target, offset);
  const fov = Math.min(95, (camera.fov || 48) + Math.max(0, 1.45 - aspect) * 28);
  // A 5 cm near plane spends nearly all depth precision beside a distant
  // aerial camera. Pull it out only for long shots; close props keep 5 cm.
  const near = Math.min(1, Math.max(0.05, (vec3.distance(eye, target) - 12) * 0.025));
  return mat4.multiply(
    mat4.perspective((fov * Math.PI) / 180, aspect, near, 1100),
    mat4.lookAt(eye, target, [0, 1, 0]),
  );
}

export function shadowMatrix(lighting: Lighting, target: V3) {
  const radius = lighting.shadowRadius ?? 16;
  const direction = vec3.normalize(lighting.direction);
  const right = vec3.normalize(vec3.cross([0, 1, 0], direction));
  const up = vec3.cross(direction, right);
  const texel = (radius * 2) / SHADOW_MAP_SIZE;
  // Snap in the light's fixed XY basis, not the moving camera's basis. A pan
  // can then move the shadow map only in whole texels instead of recutting
  // every leaf and vehicle edge at a different subpixel phase each frame.
  let center = vec3.copy(target);
  for (const axis of [right, up]) {
    const along = vec3.dot(target, axis);
    center = vec3.add(center, vec3.mulScalar(axis, Math.round(along / texel) * texel - along));
  }
  // Keep elevated slopes and tree crowns in front of the shadow camera.
  const depth = Math.max(80, radius * 4);
  const light = vec3.add(center, vec3.mulScalar(direction, depth / 2));
  return mat4.multiply(
    mat4.ortho(-radius, radius, -radius, radius, 0.1, depth),
    mat4.lookAt(light, center, [0, 1, 0]),
  );
}

export function frameData(camera: CameraShot, lighting: Lighting, aspect: number, offset: V3) {
  const data = new Float32Array(200);
  const vp = cameraMatrix(camera, aspect, offset);
  data.set(vp);
  data.set(shadowMatrix(lighting, camera.target), 16);
  data.set([...vec3.add(camera.eye, offset), lighting.daylight ? 1 : 0], 32);
  data.set([...lighting.sky, lighting.fog], 36);
  data.set([...lighting.ground, lighting.exposure], 40);
  data.set([...lighting.sun, 0], 44);
  data.set([...lighting.direction, 0], 48);
  lighting.lamps.slice(0, 12).forEach((lamp, i) => {
    data.set([...lamp.position, lamp.power], 52 + i * 8);
    data.set([...lamp.color, 0], 56 + i * 8);
  });
  data.set(mat4.inverse(vp), 148);
  lighting.contacts?.slice(0, 8).forEach((contact, i) => {
    data.set([...contact.position, contact.radius], 164 + i * 4);
  });
  data.set(lighting.atmosphere, 196);
  return { data, vp };
}

export function project(point: V3, matrix: Float32Array) {
  const x = point[0],
    y = point[1],
    z = point[2];
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  if (w <= 0) return null;
  const p = vec3.transformMat4(point, matrix);
  if (p[2] < 0 || p[2] > 1 || Math.abs(p[0]) > 1.02 || Math.abs(p[1]) > 1.02) return null;
  return { x: (p[0] + 1) * 50, y: (1 - p[1]) * 50 };
}
