/**
 * Runtime URLs for the generated story art merged from the main branch.
 * Keeping the map in one place lets the staging and dialogue layers use the
 * same identity for a character or item while the SVG illustrations remain a
 * graceful fallback for states without a dedicated asset.
 */
export const storyAssets = {
  scenes: {
    templeGate: '/art/story/scenes/temple_gate.webp',
    registration: '/art/story/scenes/registration.webp',
    registrationDesk: '/art/story/scenes/registration_desk.webp',
    registrationLedgerOpen: '/art/story/scenes/registration_ledger_open.webp',
    registrationLedgerClosed: '/art/story/scenes/registration_ledger_closed.webp',
    registrationCopperKey: '/art/story/scenes/registration_copper_key.webp',
    registrationPermitStack: '/art/story/scenes/registration_permit_stack.webp',
    registrationPermitSingle: '/art/story/scenes/registration_permit_single.webp',
    registrationRoomTag: '/art/story/scenes/registration_room_tag.webp',
    registrationPropsOpenStack: '/art/story/scenes/registration_props_open_stack.webp',
    registrationPropsClosedStack: '/art/story/scenes/registration_props_closed_stack.webp',
    registrationPropsOpenSingle: '/art/story/scenes/registration_props_open_single.webp',
    eastCourtyard: '/art/story/scenes/east_courtyard.webp',
    playerRoom: '/art/story/scenes/player_room.webp',
  },
  characters: {
    linlan: '/art/story/characters/lin_lan.webp',
    zhouyan: '/art/story/characters/zhou_yan.webp',
    xuzhi: '/art/story/characters/xu_zhi.webp',
    luchen: '/art/story/characters/lu_chen.webp',
    huipu: '/art/story/characters/hui_pu.webp',
    shangong: '/art/story/characters/shen_gong.webp',
  },
  portraits: {
    linlan: '/art/story/portraits/lin_lan.webp',
    zhouyan: '/art/story/portraits/zhou_yan.webp',
    xuzhi: '/art/story/portraits/xu_zhi.webp',
    luchen: '/art/story/portraits/lu_chen.webp',
    huipu: '/art/story/portraits/hui_pu.webp',
    shangong: '/art/story/portraits/shen_gong.webp',
    unknown: '/art/story/portraits/unknown.webp',
  },
  items: {
    key: '/art/story/items/copper_key.webp',
    page: '/art/story/items/torn_page.webp',
    candle: '/art/story/items/red_candle.webp',
    beads: '/art/story/items/prayer_beads.webp',
    permit: '/art/story/items/permit.webp',
  },
} as const;

export type StoryCharacterId = keyof typeof storyAssets.characters;
