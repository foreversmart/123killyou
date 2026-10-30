// Ridge envelopes and contour-aligned erosion follow Tidewater's IslandShape /
// TerrainNoise approach. See docs/tidewater_license.txt for its MIT notice.
export const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

function hash(x: number, z: number) {
  let h = Math.imul(x, 374761393) + Math.imul(z, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise(x: number, z: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const u = smooth(x - ix),
    v = smooth(z - iz);
  const a = hash(ix, iz) * (1 - u) + hash(ix + 1, iz) * u;
  const b = hash(ix, iz + 1) * (1 - u) + hash(ix + 1, iz + 1) * u;
  return a * (1 - v) + b * v;
}

type Crest = [number, number, number, number];
const ridges: Crest[][] = [
  [
    [-300, -245, 95, 125],
    [-205, -285, 165, 145],
    [-110, -310, 195, 155],
    [-20, -300, 174, 150],
    [75, -330, 205, 165],
    [190, -290, 168, 150],
    [315, -215, 95, 135],
  ],
  [
    [-205, -285, 145, 135],
    [-175, -180, 125, 115],
    [-145, -95, 95, 105],
    [-150, 0, 72, 95],
    [-190, 110, 44, 95],
  ],
  [
    [75, -330, 165, 140],
    [135, -215, 128, 120],
    [150, -110, 100, 100],
    [175, -10, 76, 105],
    [220, 110, 52, 95],
  ],
  [
    [-35, -290, 150, 120],
    [-24, -195, 105, 110],
    [-8, -120, 67, 95],
    [4, -65, 38, 85],
  ],
  [
    [-300, 30, 85, 145],
    [-255, 145, 65, 125],
    [-290, 240, 45, 115],
  ],
  [
    [310, -65, 105, 130],
    [290, 75, 85, 135],
    [320, 220, 58, 120],
  ],
];

export function ridgeHeight(x: number, z: number) {
  let sum = 0;
  for (const ridge of ridges) {
    let crest = 0;
    for (let i = 1; i < ridge.length; i++) {
      const a = ridge[i - 1],
        b = ridge[i];
      const dx = b[0] - a[0],
        dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      const width = a[3] + (b[3] - a[3]) * t;
      const distance = Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) / width;
      if (distance >= 1) continue;
      const u = (Math.sqrt(distance * distance + 0.0049) - 0.07) / 0.932447;
      const height = (a[2] + (b[2] - a[2]) * t) * (1 - u) ** 2 * (1 + 0.5 * u);
      crest = Math.max(crest, height);
    }
    sum += crest ** 6;
  }
  return sum ** (1 / 6);
}

export function mountainHeight(x: number, z: number) {
  const wx = x + (noise(x / 83 + 4, z / 91) - 0.5) * 20;
  const wz = z + (noise(x / 97, z / 81 + 8) - 0.5) * 18;
  const crest = ridgeHeight(wx, wz);
  const gx = (ridgeHeight(wx + 3, wz) - ridgeHeight(wx - 3, wz)) / 6;
  const gz = (ridgeHeight(wx, wz + 3) - ridgeHeight(wx, wz - 3)) / 6;
  const slope = Math.hypot(gx, gz);
  // Warped contour noise makes branching gullies run downhill, leaving broad
  // shoulders between them instead of an isotropic field of rounded bumps.
  const contour = (wx * gz - wz * gx) / Math.max(0.4, slope);
  const erosion =
    (noise(contour / 24, (wx + wz) / 110) - 0.5) * 10 +
    (noise(contour / 9 + 11, (wx + wz) / 45) - 0.5) * 3.5;
  const detail = (noise(x / 11, z / 11) - 0.5) * 2.2 + (noise(x / 3.7, z / 3.7) - 0.5) * 0.45;
  // A broad natural shoulder supports the contour road. Grading then changes
  // only its verges instead of creating isolated embankments above a flat pit.
  const shoulder =
    Math.max(0, 48 - Math.max(0, z) * 0.25) *
    (1 - smooth(-z / 85)) *
    (1 - smooth((Math.abs(x) - 90) / 95));
  return -48 + smooth(-z / 320) * 30 + shoulder + crest + erosion * smooth(slope / 0.7) + detail;
}
