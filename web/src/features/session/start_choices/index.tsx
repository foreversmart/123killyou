import { useEffect, useRef, useState } from 'react';
import { storyAssets } from '@/shared/lib/story_assets';
import styles from './style.module.css';

type OpeningPhase = 'reel' | 'journey';

export function StartChoices({
  busy,
  voiceActive,
  onReady,
}: {
  busy: boolean;
  voiceActive: boolean;
  onReady: () => void;
}) {
  const [phase, setPhase] = useState<OpeningPhase>('reel');
  const reel = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (phase !== 'reel') return;
    const video = reel.current;
    if (!video) return;
    void video.play().catch(() => {
      // The startup voice gesture normally unlocks autoplay before this screen mounts.
    });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'journey') return;
    onReady();
  }, [onReady, phase]);

  if (phase === 'reel') {
    return (
      <div className={styles.openingScreen} data-opening-phase="reel" aria-label="片头播放">
        <video
          ref={reel}
          className={styles.video}
          src={storyAssets.video.opening}
          poster={storyAssets.video.titleCard}
          autoPlay
          playsInline
          onEnded={() => setPhase('journey')}
          aria-label="红烛寺片头"
        />
      </div>
    );
  }

  return (
    <div className={styles.openingScreen} data-opening-phase="journey" aria-label="片头结束">
      <div className={styles.journeyScene} aria-hidden="true">
        <img className={styles.journeyRoad} src={storyAssets.scenes.busDeparture} alt="" />
        <img className={styles.journeyGate} src={storyAssets.scenes.busArrival} alt="" />
        <span className={styles.journeyGlow} />
      </div>
      <div className={styles.journeyVeil} aria-hidden="true" />
      <div className={styles.startPrompt} role="status" aria-live="polite">
        <span>片头结束 · 山门已近</span>
        <strong>{busy ? '正在进入游戏…' : '请说“开始游戏”'}</strong>
        <small>{voiceActive ? '按住空格说话' : '语音正在连接…'}</small>
      </div>
    </div>
  );
}
