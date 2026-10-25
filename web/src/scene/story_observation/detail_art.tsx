import { storyAssets } from '@/shared/lib/story_assets';

export function DoorDetail({ wet }: { wet: boolean }) {
  if (wet)
    return <img src={storyAssets.details.doorLatchWet} alt="门闩上的水痕，门缝红蜡仍然完整" />;
  return (
    <svg viewBox="990 285 375 335" role="img" aria-label="门内侧锁紧的铜闩与门缝红蜡">
      <image href={storyAssets.scenes.playerRoom} width="1672" height="941" />
    </svg>
  );
}

export function ShadowDetail({ seam, identity }: { seam: boolean; identity?: string }) {
  const poses = storyAssets.characterPoses;
  const source =
    identity === 'linlan'
      ? poses.linlan.revealed
      : identity === 'zhouyan'
        ? poses.zhouyan.revealed
        : identity === 'xuzhi'
          ? poses.xuzhi.revealed
          : undefined;
  if (seam && source)
    return (
      <svg viewBox="330 570 750 500" role="img" aria-label="同行人衣领边露出的缝线">
        <image href={source} width="1254" height="1254" />
      </svg>
    );
  return <img src={storyAssets.details.brokenShadow} alt="烛光下鞋尖旁不完整的影子" />;
}
