import { useEffect, useRef, useState } from 'react';
import { storyAssets } from '@/shared/lib/story_assets';
import { bindOpeningSkipKey } from './keys';
import styles from './style.module.css';

export function StartChoices({
  ready,
  busy,
  voiceActive,
  onReady,
  onBegin,
}: {
  ready: boolean;
  busy: boolean;
  voiceActive: boolean;
  onReady: () => void;
  onBegin: () => Promise<void>;
}) {
  const reel = useRef<HTMLVideoElement>(null);
  const [playBlocked, setPlayBlocked] = useState(false);
  const [titleFallback, setTitleFallback] = useState(false);

  useEffect(() => {
    void reel.current?.play().catch(() => setPlayBlocked(true));
  }, []);

  useEffect(() => {
    if (ready) return;
    return bindOpeningSkipKey(window, () => {
      const video = reel.current;
      if (video && Number.isFinite(video.duration)) {
        video.currentTime = Math.max(0, video.duration - 0.05);
        video.pause();
      } else setTitleFallback(true);
      onReady();
    });
  }, [onReady, ready]);

  return (
    <div
      className={styles.openingScreen}
      data-opening-phase={ready ? 'ready' : 'reel'}
      aria-label={ready ? '红烛无声，开始旅程' : '片头播放'}
    >
      {titleFallback ? (
        <img className={styles.video} src={storyAssets.video.titleCard} alt="红烛无声" />
      ) : (
        <video
          ref={reel}
          className={styles.video}
          src={storyAssets.video.opening}
          poster={storyAssets.video.titleCard}
          autoPlay
          playsInline
          onEnded={onReady}
          onError={() => {
            setTitleFallback(true);
            onReady();
          }}
          aria-label="红烛寺片头"
        />
      )}
      {ready ? (
        <div className={styles.startPrompt}>
          <button type="button" disabled={busy} onClick={() => void onBegin()}>
            {busy ? '正在准备…' : '开始游戏'}
          </button>
          <small>{voiceActive ? '或按住空格，说“开始游戏”' : '语音正在连接…'}</small>
        </div>
      ) : playBlocked ? (
        <button
          className={styles.playPrompt}
          type="button"
          onClick={() => {
            void reel.current?.play().then(() => setPlayBlocked(false));
          }}
        >
          播放片头
        </button>
      ) : null}
    </div>
  );
}
