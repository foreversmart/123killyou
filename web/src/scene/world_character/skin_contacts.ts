import type { Geometry } from '@/scene/world/types';

/** Only evaluate contact heights; the full character still deforms on the GPU. */
export function skinGroundContact(geometry?: Geometry) {
  const contacts: number[] = [];
  if (geometry?.skin)
    for (let vertex = 0; vertex < geometry.vertices.length / 16; vertex++)
      if (geometry.vertices[vertex * 16 + 1] < 0.65) contacts.push(vertex);
  return (matrices: Float32Array, planted = false) => {
    if (!geometry?.skin) return 0;
    const { vertices, skin } = geometry;
    let lowest = planted && contacts.length ? Infinity : 0;
    for (const vertex of contacts) {
      const p = vertex * 16;
      let y = 0;
      for (let slot = 0; slot < 4; slot++) {
        const influence = vertex * 4 + slot;
        const bone = skin.joints[influence] * 16;
        y +=
          skin.weights[influence] *
          (matrices[bone + 1] * vertices[p] +
            matrices[bone + 5] * vertices[p + 1] +
            matrices[bone + 9] * vertices[p + 2] +
            matrices[bone + 13]);
      }
      lowest = Math.min(lowest, y);
    }
    return -lowest;
  };
}
