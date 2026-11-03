import type { Identity } from '@/scene/world_character/identity';

export type CharacterModelAssets = {
  torso: string;
  head: string;
  arms: [string, string];
  legs: [string, string];
};

const models: Partial<Record<Identity, CharacterModelAssets>> = {
  luchen: {
    torso: 'luchen_model_torso',
    head: 'luchen_model_head',
    arms: ['luchen_model_right_arm', 'luchen_model_left_arm'],
    legs: ['luchen_model_right_leg', 'luchen_model_left_leg'],
  },
  xuzhi: {
    torso: 'xuzhi_model_torso',
    head: 'xuzhi_model_head',
    arms: ['xuzhi_model_right_arm', 'xuzhi_model_left_arm'],
    legs: ['xuzhi_model_right_leg', 'xuzhi_model_left_leg'],
  },
};

export function characterModelAssets(id: Identity) {
  return models[id];
}
