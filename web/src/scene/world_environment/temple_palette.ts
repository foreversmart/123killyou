import type { Material } from '@/scene/world/types';

// Mineral pigments and worn leaf from the user's temple references. Pigmented
// lacquer stays separate from the raw timber texture, which desaturates paint.
export const templeRed: Material = { color: 0x8c4035, rough: 0.8, pattern: 5 };
export const templeJade: Material = { color: 0x457b71, rough: 0.76, pattern: 5 };
export const templeGold: Material = { color: 0xc6a267, rough: 0.52, metal: 0.48, pattern: 5 };
export const templeInk: Material = { color: 0x293c3c, rough: 0.88, pattern: 5 };
export const templeCream: Material = { color: 0xc6b99b, rough: 0.9, pattern: 5 };

// Slots append to the existing local material library; packed mesh indices stay fixed.
export const templePaint: Material = { color: 0xffffff, rough: 0.85, metal: 0.25, pattern: 39 };
export const templeRelief: Material = { color: 0xffffff, rough: 0.91, metal: 0.15, pattern: 40 };
