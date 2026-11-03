import type { Material } from '@/scene/world/types';

export type GuardianKind = 'pipa' | 'sword' | 'dragon' | 'umbrella';
export type GuardianPalette = ReturnType<typeof guardianPalette>;
export const gilt: Material = { color: 0xffffff, rough: 0.75, metal: 0.55, pattern: 36 };
export const shadowGold: Material = { color: 0xbfa16b, rough: 0.76, metal: 0.35, pattern: 37 };
export const ebony: Material = { color: 0x242724, rough: 0.84 };
export const ivory: Material = { color: 0xc8b991, rough: 0.8 };
export function guardianPalette(kind: GuardianKind) {
  const faces = { pipa: 0xb78b59, sword: 0x547c78, dragon: 0x9c493b, umbrella: 0x496b75 };
  const accents = { pipa: 0x406e70, sword: 0x805040, dragon: 0x426f66, umbrella: 0x796242 };
  return {
    skin: { color: faces[kind], rough: 0.84, pattern: 39 } as Material,
    trim: { color: accents[kind], rough: 0.78, pattern: 2 } as Material,
    robe: { color: kind === 'dragon' ? 0x854437 : 0x3d5551, rough: 0.91, pattern: 2 } as Material,
    eyes: { color: 0xdba86c, rough: 0.6, glow: 0.035 } as Material,
  };
}
