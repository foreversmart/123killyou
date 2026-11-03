import type { Geometry } from '@/scene/world/types';

function sameData(a?: Float32Array | Uint32Array, b?: Float32Array | Uint32Array) {
  if (a === b) return true;
  if (!a || !b || a.byteLength !== b.byteLength) return false;
  const left = new Uint32Array(a.buffer, a.byteOffset, a.length);
  const right = new Uint32Array(b.buffer, b.byteOffset, b.length);
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  return true;
}

/** Authored procedural meshes may be rebuilt as equal arrays for a new story beat. */
export function sameGeometry(a: Geometry, b: Geometry) {
  return (
    a === b ||
    (sameData(a.vertices, b.vertices) &&
      sameData(a.indices, b.indices) &&
      sameData(a.vegetation, b.vegetation) &&
      Boolean(a.skin) === Boolean(b.skin) &&
      a.skin?.skeleton.bones.length === b.skin?.skeleton.bones.length &&
      sameData(a.skin?.joints, b.skin?.joints) &&
      sameData(a.skin?.weights, b.skin?.weights))
  );
}
