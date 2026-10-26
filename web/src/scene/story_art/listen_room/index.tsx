import type { GameState } from '@/shared/types/game';
import { storyAssets } from '@/shared/lib/story_assets';

export function ListenRoomArt({ state }: { id: string; state: GameState }) {
  const turned = state.flags.vase_broken || state.shotKey === 'listen_vase';
  return (
    <image
      href={turned ? storyAssets.scenes.guestRoomTurning : storyAssets.scenes.guestRoomNight}
      width="1000"
      height="600"
      preserveAspectRatio="xMidYMid slice"
    />
  );
}
