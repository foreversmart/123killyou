import { Builder, materials as M } from '@/scene/geometry/builder';
import { sphere } from '@/scene/geometry/primitives';
import { node, type Geometry, type Material, type V3, type WorldNode } from '@/scene/world/types';

type TreeVariant = 'broadleaf' | 'conifer' | 'willow' | 'columnar' | 'rain_tree' | 'shrub';

const cache = new Map<TreeVariant, Geometry>();
const bark = { ...M.darkWood, color: 0x403328, rough: 0.94 };
const leafMaterials: Record<TreeVariant, Material> = {
  broadleaf: { color: 0x98b66b, rough: 0.96, pattern: 23 },
  conifer: { color: 0x769e70, rough: 0.97, pattern: 23 },
  willow: { color: 0xb2c77b, rough: 0.96, pattern: 23 },
  columnar: { color: 0x8eae79, rough: 0.97, pattern: 23 },
  rain_tree: { color: 0x6f9562, rough: 0.97, pattern: 23 },
  shrub: { color: 0x9fbe69, rough: 0.96, pattern: 23 },
};
const crownMassMaterials: Record<TreeVariant, Material> = {
  broadleaf: { color: 0x2d4b2c, rough: 0.99 },
  conifer: { color: 0x24432b, rough: 0.99 },
  willow: { color: 0x3a5b31, rough: 0.99 },
  columnar: { color: 0x2f522e, rough: 0.99 },
  rain_tree: { color: 0x294b2b, rough: 0.99 },
  shrub: { color: 0x355f32, rough: 0.99 },
};
const crownMass = sphere(1, 8, 4);

// Sample only the isolated leaf islands from tree_1. The lower-right atlas
// blocks contain branch and trunk pixels, and a small gutter keeps filtered
// edges from pulling those pixels back into a leaf card.
const leafRegions: [number, number, number, number][] = [
  [0.055, 0.19, 0.045, 0.18],
  [0.275, 0.45, 0.05, 0.18],
  [0.055, 0.19, 0.265, 0.43],
  [0.3, 0.48, 0.265, 0.43],
  [0.055, 0.19, 0.515, 0.68],
  [0.32, 0.51, 0.515, 0.68],
  [0.055, 0.19, 0.785, 0.925],
];
const leafCard = {
  positions: [-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0],
  normals: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
  uv: [0, 1, 1, 1, 1, 0, 0, 0],
  indices: [0, 1, 2, 0, 2, 3],
};

function addLeaf(
  b: Builder,
  center: V3,
  width: number,
  height: number,
  yaw: number,
  pitch: number,
  region: number,
  material: Material,
) {
  const [u0, u1, v0, v1] = leafRegions[region % leafRegions.length];
  b.add(
    { ...leafCard, uv: [u0, v1, u1, v1, u1, v0, u0, v0] },
    material,
    center,
    [width, height, 1],
    [pitch, yaw, 0],
  );
}

function addCluster(
  b: Builder,
  center: V3,
  radius: number,
  count: number,
  regionOffset: number,
  material: Material,
  massMaterial: Material,
  droop = 0,
) {
  // A small low-poly leaf mass keeps the crown readable from the elevated
  // opening camera. It is deliberately undersized so the finer leaf cards and
  // twig silhouettes still create the surface detail.
  b.add(
    crownMass,
    massMaterial,
    center,
    [radius * 0.7, radius * 0.34, radius * 0.62],
    [0, regionOffset * 0.31, 0],
  );
  for (let i = 0; i < count; i++) {
    // Leave occasional open slots in every crown. The gaps expose twigs and sky,
    // which keeps the atlas cards from merging into pale, flat sheets at distance.
    if ((i * 5 + regionOffset * 3) % 13 === 0) continue;
    const angle = (i * 2.399 + regionOffset * 0.73) % (Math.PI * 2);
    const ring = radius * (0.32 + ((i * 17) % 9) / 14);
    const leafCenter: V3 = [
      center[0] + Math.cos(angle) * ring,
      center[1] + (i % 3) * 0.14 - droop * ring * 0.3,
      center[2] + Math.sin(angle) * ring,
    ];
    // Fine three-way twigs make the crown read as branches carrying leaves instead
    // of intersecting billboard cards. They remain thin enough to disappear into
    // the canopy from the opening camera.
    if (i % 2 === 0) b.rod(center, leafCenter, 0.014, bark, 0.008);
    addLeaf(
      b,
      leafCenter,
      radius * (0.43 + (i % 3) * 0.055),
      radius * (0.29 + (i % 2) * 0.055),
      angle + Math.PI / 2,
      droop + Math.sin(angle) * 0.16,
      regionOffset + i * 3,
      material,
    );
    // A smaller crossing card on one third of the tips gives a layered crown
    // without rebuilding a dense rectangular billboard around every leaf.
    if (i % 3 === 1)
      addLeaf(
        b,
        [leafCenter[0], leafCenter[1] + radius * 0.035, leafCenter[2]],
        radius * 0.27,
        radius * 0.19,
        angle - Math.PI / 2,
        droop * 0.7,
        regionOffset + i * 3 + 1,
        material,
      );
  }
}

function makeBroadleaf() {
  const b = new Builder();
  const leaf = leafMaterials.broadleaf;
  const mass = crownMassMaterials.broadleaf;
  b.rod([0, 0, 0], [0, 4.4, 0], 0.23, bark, 0.1);
  b.rod([0, 2.5, 0], [-1.35, 3.65, 0.25], 0.09, bark, 0.03);
  b.rod([0, 2.85, 0], [1.25, 3.55, -0.3], 0.09, bark, 0.03);
  b.rod([0, 3.35, 0], [0.1, 4.7, -0.4], 0.07, bark, 0.025);
  addCluster(b, [0, 4.55, 0], 1.85, 10, 0, leaf, mass);
  addCluster(b, [-1.05, 3.75, 0.25], 1.3, 7, 3, leaf, mass);
  addCluster(b, [1.0, 3.7, -0.28], 1.35, 7, 6, leaf, mass);
  addCluster(b, [0.1, 5.15, -0.38], 1.1, 6, 9, leaf, mass);
  return b.build();
}

function makeConifer() {
  const b = new Builder();
  const leaf = leafMaterials.conifer;
  const mass = crownMassMaterials.conifer;
  b.rod([0, 0, 0], [0, 6.6, 0], 0.17, bark, 0.07);
  for (let tier = 0; tier < 7; tier++) {
    const y = 1.05 + tier * 0.86,
      radius = 1.2 - tier * 0.12;
    b.add(crownMass, mass, [0, y, 0], [radius * 0.92, 0.32, radius * 0.92]);
    for (let arm = 0; arm < 7; arm++) {
      const angle = (arm * Math.PI * 2) / 7 + tier * 0.4;
      b.rod(
        [0, y - 0.2, 0],
        [Math.cos(angle) * radius, y + 0.1, Math.sin(angle) * radius],
        0.035,
        bark,
        0.012,
      );
      addLeaf(
        b,
        [Math.cos(angle) * radius * 0.72, y + 0.08, Math.sin(angle) * radius * 0.72],
        radius * 1.2,
        radius * 0.34,
        angle,
        -0.12,
        tier + arm + 1,
        leaf,
      );
      // Cross the needle sprays so the crown keeps its volume when viewed
      // from an oblique opening camera instead of collapsing into bare rods.
      addLeaf(
        b,
        [Math.cos(angle) * radius * 0.66, y + 0.1, Math.sin(angle) * radius * 0.66],
        radius * 0.94,
        radius * 0.28,
        angle + Math.PI / 2,
        -0.08,
        tier + arm + 4,
        leaf,
      );
    }
  }
  return b.build();
}

function makeWillow() {
  const b = new Builder();
  const leaf = leafMaterials.willow;
  const mass = crownMassMaterials.willow;
  b.rod([0, 0, 0], [0.05, 4.2, 0], 0.24, bark, 0.1);
  const branches: [number, number, number, number][] = [
    [-1.35, 3.55, 0.25, 0.82],
    [-0.75, 4.3, -0.35, 0.95],
    [0.1, 4.65, 0.2, 1.05],
    [0.85, 4.1, -0.25, 0.9],
    [1.35, 3.5, 0.3, 0.78],
    [-0.2, 3.5, -0.7, 0.88],
  ];
  branches.forEach(([x, y, z, radius], index) => {
    b.rod([0, 2.35, 0], [x * 0.72, y - 0.18, z * 0.72], 0.065, bark, 0.022);
    addCluster(b, [x, y, z], radius, 6, index + 2, leaf, mass, 0.65);
  });
  return b.build();
}

function makeColumnar() {
  const b = new Builder();
  const leaf = leafMaterials.columnar;
  const mass = crownMassMaterials.columnar;
  b.rod([0, 0, 0], [0, 6.8, 0], 0.16, bark, 0.07);
  for (let tier = 0; tier < 6; tier++)
    addCluster(b, [0, 1.1 + tier * 1.03, 0], 1.2 - tier * 0.13, 7, tier * 2 + 1, leaf, mass, 0.05);
  return b.build();
}

function makeRainTree() {
  const b = new Builder();
  const leaf = leafMaterials.rain_tree;
  const mass = crownMassMaterials.rain_tree;
  b.rod([0, 0, 0], [0, 4.35, 0], 0.24, bark, 0.1);
  const branches: [number, number, number, number][] = [
    [-1.5, 4.0, 0.2, 1.1],
    [-0.72, 4.65, -0.2, 1.25],
    [0.12, 4.9, 0.12, 1.35],
    [0.92, 4.45, -0.18, 1.15],
    [1.5, 3.95, 0.22, 1.0],
  ];
  branches.forEach(([x, y, z, radius], index) => {
    b.rod([0, 2.8, 0], [x * 0.62, y - 0.2, z * 0.62], 0.075, bark, 0.025);
    addCluster(b, [x, y, z], radius, 8, index * 2 + 4, leaf, mass, 0.18);
  });
  return b.build();
}

function makeShrub() {
  const b = new Builder();
  const leaf = leafMaterials.shrub;
  const mass = crownMassMaterials.shrub;
  b.rod([0, 0, 0], [0, 0.75, 0], 0.06, bark, 0.02);
  addCluster(b, [0, 0.72, 0], 0.85, 9, 1, leaf, mass);
  addCluster(b, [-0.35, 0.56, 0.12], 0.58, 6, 5, leaf, mass, 0.22);
  return b.build();
}

function geometryFor(variant: TreeVariant) {
  let geometry = cache.get(variant);
  if (geometry) return geometry;
  geometry =
    variant === 'broadleaf'
      ? makeBroadleaf()
      : variant === 'conifer'
        ? makeConifer()
        : variant === 'willow'
          ? makeWillow()
          : variant === 'columnar'
            ? makeColumnar()
            : variant === 'rain_tree'
              ? makeRainTree()
              : makeShrub();
  cache.set(variant, geometry);
  return geometry;
}

export function proceduralTree(variant: TreeVariant, scale = 1, rotation = 0): WorldNode {
  const result = node('procedural_tree_' + variant, geometryFor(variant));
  result.scale = [scale, scale, scale];
  result.rotation[1] = rotation;
  result.wind =
    variant === 'shrub' ? 0.9 : variant === 'columnar' || variant === 'conifer' ? 0.42 : 0.58;
  result.shadow = variant !== 'shrub';
  return result;
}

export type { TreeVariant };
