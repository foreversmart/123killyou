import type { Material } from '@/scene/world/types';

// Mineral pigments and worn leaf from the user's temple references. Pigmented
// lacquer stays separate from the raw timber texture, which desaturates paint.
export const templeRed: Material = { color: 0x8c4035, rough: 0.8, pattern: 5 };
export const templeJade: Material = { color: 0x457b71, rough: 0.76, pattern: 5 };
export const templeGold: Material = { color: 0xc6a267, rough: 0.52, metal: 0.48, pattern: 5 };
export const templeInk: Material = { color: 0x293c3c, rough: 0.88, pattern: 5 };
export const templeCream: Material = { color: 0xc6b99b, rough: 0.9, pattern: 5 };

// The outer gate reference uses a restrained lacquered timber language. Keep
// these materials separate from the brighter polychrome palette used by
// carved halls so every threshold can share the same dark red and ironwork.
export const gateWood: Material = { color: 0x541d24, rough: 0.91, pattern: 1 };
export const gateWoodInset: Material = { color: 0x68252b, rough: 0.94, pattern: 1 };
export const gateWoodRail: Material = { color: 0x32151a, rough: 0.97, pattern: 1 };
export const gateIron: Material = { color: 0x111416, rough: 0.82, metal: 0.42, pattern: 5 };
export const gateStone: Material = { color: 0xa3a5a3, rough: 0.92, pattern: 4 };
export const gateStoneShadow: Material = { color: 0x747878, rough: 0.96, pattern: 4 };

// Slots append to the existing local material library; packed mesh indices stay fixed.
export const templePaint: Material = { color: 0xffffff, rough: 0.85, metal: 0.25, pattern: 34 };
export const templeRelief: Material = { color: 0xffffff, rough: 0.91, metal: 0.15, pattern: 35 };
