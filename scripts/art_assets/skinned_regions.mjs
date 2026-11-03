import sharp from 'sharp';

/** Separate fused scan contacts so a moving palm/camera cannot drag trousers or shirt. */
export async function splitScanRegions(vertices, indices, texture) {
  const { data, info } = await sharp(texture)
    .resize(512, 512)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const color = (ids) => {
    const uv = [13, 14].map(
      (axis) => ids.reduce((sum, index) => sum + vertices[index * 16 + axis], 0) / 3,
    );
    // glTF's exported UVs already use the image's upper-left origin.
    const [x, y] = uv.map((value) => Math.max(0, Math.min(511, Math.round(value * 511))));
    const start = (y * 512 + x) * info.channels;
    return Array.from(data.subarray(start, start + 3));
  };
  const packed = [],
    sourceIndices = [],
    remapped = [],
    regions = [],
    used = new Map();
  const counts = [0, 0, 0];
  const minimum = [Infinity, Infinity, Infinity],
    maximum = [-Infinity, -Infinity, -Infinity];
  for (let triangle = 0; triangle < indices.length; triangle += 3) {
    const ids = Array.from(indices.subarray(triangle, triangle + 3));
    const center = [0, 1, 2].map(
      (axis) => ids.reduce((sum, index) => sum + vertices[index * 16 + axis], 0) / 3,
    );
    const [x, y, z] = [center[0] / 0.85, center[1] / 0.85 - 1, center[2] / 0.85];
    const [r, g, b] = color(ids);
    const cameraBox =
      (x > -0.164 && x < -0.022 && y > 0.233 && y < 0.343 && z > 0.137) ||
      (x > -0.124 && x < -0.089 && y > 0.34 && y < 0.358 && z > 0.15);
    const cameraColor = (r + g + b) / 3 < 120 && Math.max(r, g, b) - Math.min(r, g, b) < 35;
    // A centroid near the body's edge can belong to the gripping fingers.
    // Require the entire camera triangle to remain inside its scan silhouette.
    const cameraSurface = ids.every((index) => {
      const start = index * 16;
      const px = vertices[start] / 0.85;
      const py = vertices[start + 1] / 0.85 - 1;
      const pz = vertices[start + 2] / 0.85;
      return (
        px >= -0.17 && px <= -0.016 && py >= 0.227 && py <= 0.364 && pz >= 0.132 && pz <= 0.232
      );
    });
    const handBox =
      x > Math.max(0.132, 0.105 - 0.2 * y, y > 0.015 ? 0.145 : 0) &&
      x < 0.21 &&
      y > -0.17 &&
      y < 0.055 &&
      z > -0.075 &&
      z < 0.075;
    const skinColor = r > 105 && r - g > 18 && r - b > 30 && r > g * 1.1 && r > b * 1.22;
    const region = cameraBox && cameraColor && cameraSurface ? 2 : handBox && skinColor ? 1 : 0;
    counts[region]++;
    for (const index of ids) {
      const key = index + ':' + region;
      if (!used.has(key)) {
        used.set(key, used.size);
        packed.push(...vertices.subarray(index * 16, index * 16 + 16));
        sourceIndices.push(index);
        regions.push(region);
      }
      remapped.push(used.get(key));
      if (region === 2)
        for (let axis = 0; axis < 3; axis++) {
          const value = vertices[index * 16 + axis];
          minimum[axis] = Math.min(minimum[axis], value);
          maximum[axis] = Math.max(maximum[axis], value);
        }
    }
  }
  if (counts[2] < 10) throw new Error('The current scan camera region was not found.');
  return {
    vertices: new Float32Array(packed),
    indices: new Uint32Array(remapped),
    regions,
    sourceIndices,
    camera: {
      bone: 'neutral_bone',
      center: minimum.map((value, axis) => (value + maximum[axis]) / 2),
    },
    counts,
  };
}
