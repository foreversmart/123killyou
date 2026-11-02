import type { Identity } from '@/scene/world_character/identity';

export type CharacterModelAssets = {
  torso: string;
  head: string;
  arms: [string, string];
  legs: [string, string];
};

const models: Partial<Record<Identity, CharacterModelAssets>> = {
  huipu: {
    torso: 'huipu_model_torso', head: 'huipu_model_head',
    arms: ['huipu_model_right_arm', 'huipu_model_left_arm'],
    legs: ['huipu_model_right_leg', 'huipu_model_left_leg'],
  },
  linlan: {
    torso: 'linlan_model_torso', head: 'linlan_model_head',
    arms: ['linlan_model_right_arm', 'linlan_model_left_arm'],
    legs: ['linlan_model_right_leg', 'linlan_model_left_leg'],
  },
  luchen: {
    torso: 'luchen_model_torso', head: 'luchen_model_head',
    arms: ['luchen_model_right_arm', 'luchen_model_left_arm'],
    legs: ['luchen_model_right_leg', 'luchen_model_left_leg'],
  },
  xuzhi: {
    torso: 'xuzhi_model_torso', head: 'xuzhi_model_head',
    arms: ['xuzhi_model_right_arm', 'xuzhi_model_left_arm'],
    legs: ['xuzhi_model_right_leg', 'xuzhi_model_left_leg'],
  },
  zhaoxi: {
    torso: 'zhaoxi_model_torso', head: 'zhaoxi_model_head',
    arms: ['zhaoxi_model_right_arm', 'zhaoxi_model_left_arm'],
    legs: ['zhaoxi_model_right_leg', 'zhaoxi_model_left_leg'],
  },
  zhouyan: {
    torso: 'zhouyan_model_torso', head: 'zhouyan_model_head',
    arms: ['zhouyan_model_right_arm', 'zhouyan_model_left_arm'],
    legs: ['zhouyan_model_right_leg', 'zhouyan_model_left_leg'],
  },
};

export function characterModelAssets(id: Identity) {
  return models[id];
}
