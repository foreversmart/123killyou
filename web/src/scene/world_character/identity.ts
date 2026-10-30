export const identities = {
  linlan: {
    name: '林岚',
    skin: 0xc69d7c,
    coat: 0x9b8668,
    shirt: 0xd6cdb6,
    trousers: 0x4b4b45,
    hair: 0x332c27,
    hairLength: 0.18,
    height: 0.97,
    face: 24,
  },
  zhouyan: {
    name: '周砚',
    skin: 0xb28c6e,
    coat: 0x343e49,
    shirt: 0x777970,
    trousers: 0x454744,
    hair: 0x292825,
    hairLength: 0.04,
    height: 1.04,
    face: 25,
  },
  xuzhi: {
    name: '许栀',
    skin: 0xc6a184,
    coat: 0x7c8069,
    shirt: 0xe2d9c1,
    trousers: 0x52534b,
    hair: 0x302b26,
    hairLength: 0.25,
    height: 0.96,
    face: 26,
  },
  luchen: {
    name: '陆沉',
    skin: 0xb18b6a,
    coat: 0x76685c,
    shirt: 0xc9b89a,
    trousers: 0x4c4840,
    hair: 0x575043,
    hairLength: 0,
    height: 1.01,
    face: 27,
  },
  huipu: {
    name: '慧普',
    skin: 0xbe9b76,
    coat: 0x897047,
    shirt: 0xbca27a,
    trousers: 0x6a5b43,
    hair: 0x514a39,
    hairLength: 0,
    height: 1.03,
    face: 28,
  },
  shangong: {
    name: '神公',
    skin: 0xa98c6a,
    coat: 0x4c423a,
    shirt: 0xb6a98e,
    trousers: 0x45413a,
    hair: 0x675d4b,
    hairLength: 0,
    height: 0.95,
    face: 29,
  },
};
export type Identity = keyof typeof identities;

export function identityOf(id: string, portrait?: string): Identity | null {
  const candidate = id === 'skin_double' || id === 'victim' ? portrait : id;
  if (candidate === 'keeper') return 'luchen';
  return candidate && candidate in identities ? (candidate as Identity) : null;
}
