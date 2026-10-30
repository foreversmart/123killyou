import { mat4, vec3 } from 'wgpu-matrix';
import type { CameraShot, Lighting, V3 } from '@/scene/world/types';

export function cameraMatrix(camera: CameraShot, aspect: number, offset: V3 = [0, 0, 0]) {
  const eye = vec3.add(camera.eye, offset),
    target = vec3.add(camera.target, offset);
  const fov = Math.min(95, (camera.fov || 48) + Math.max(0, 1.45 - aspect) * 28);
  return mat4.multiply(
    mat4.perspective((fov * Math.PI) / 180, aspect, 0.05, 320),
    mat4.lookAt(eye, target, [0, 1, 0]),
  );
}

export function shadowMatrix(lighting: Lighting, target: V3) {
  const light = vec3.add(target, vec3.mulScalar(vec3.normalize(lighting.direction), 25));
  return mat4.multiply(
    mat4.ortho(-16, 16, -16, 16, 0.1, 65),
    mat4.lookAt(light, target, [0, 1, 0]),
  );
}

export function frameData(camera: CameraShot, lighting: Lighting, aspect: number, offset: V3) {
  const data = new Float32Array(132);
  const vp = cameraMatrix(camera, aspect, offset);
  data.set(vp);
  data.set(shadowMatrix(lighting, camera.target), 16);
  data.set([...vec3.add(camera.eye, offset), lighting.daylight ? 1 : 0], 32);
  data.set([...lighting.sky, lighting.fog], 36);
  data.set([...lighting.ground, lighting.exposure], 40);
  data.set([...lighting.sun, 0], 44);
  data.set([...lighting.direction, 0], 48);
  lighting.lamps.slice(0, 4).forEach((lamp, i) => {
    data.set([...lamp.position, lamp.power], 52 + i * 8);
    data.set([...lamp.color, 0], 56 + i * 8);
  });
  data.set(mat4.inverse(vp), 84);
  lighting.contacts?.slice(0, 8).forEach((contact, i) => {
    data.set([...contact.position, contact.radius], 100 + i * 4);
  });
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
