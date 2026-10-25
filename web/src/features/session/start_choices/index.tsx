import { useCallback, useEffect, useRef, useState } from 'react';
import { storyAssets } from '@/shared/lib/story_assets';
import styles from './style.module.css';

type OpeningPhase = 'title' | 'reel' | 'journey';

export function StartChoices({
  busy,
  onBegin,
  onResume,
}: {
  busy: boolean;
  onBegin: () => Promise<void>;
  onResume: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<OpeningPhase>('title');
  const reel = useRef<HTMLVideoElement>(null);
  const started = useRef(false);

  const finishJourney = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    try {
      await onBegin();
    } finally {
      started.current = false;
    }
  }, [onBegin]);

  useEffect(() => {
    if (phase !== 'reel') return;
    const video = reel.current;
    if (!video) return;
    void video.play().catch(() => {
      // The native controls remain visible so browsers that block autoplay
      // can still start the reel from the same opening screen.
    });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'journey') return;
    const timer = window.setTimeout(() => void finishJourney(), 3900);
    return () => window.clearTimeout(timer);
  }, [finishJourney, phase]);

  if (phase === 'reel') {
    return (
      <aside className={`${styles.choices} ${styles.reel}`} aria-label="片头播放">
        <video
          ref={reel}
          className={styles.video}
          src={storyAssets.video.opening}
          poster={storyAssets.video.titleCard}
          autoPlay
          controls
          playsInline
          onEnded={() => setPhase('journey')}
          aria-label="灯影寺片头"
        />
        <p>片头播放中 · 红烛、回廊与未说完的声音</p>
        <button className={styles.resume} onClick={() => setPhase('journey')}>
          跳过片头，驶向灯影寺
        </button>
      </aside>
    );
  }

  if (phase === 'journey') {
    return (
      <aside className={`${styles.choices} ${styles.journey}`} aria-label="大巴驶向灯影寺">
        <div className={styles.journeyScene} aria-hidden="true">
          <img className={styles.journeyRoad} src={storyAssets.scenes.busDeparture} alt="" />
          <img className={styles.journeyGate} src={storyAssets.scenes.busArrival} alt="" />
          <span className={styles.journeyGlow} />
        </div>
        <span>片头之后 · 山间小路</span>
        <h2>大巴缓缓驶向灯影寺</h2>
        <p>车窗外的山色一层层退开，山门在树影尽头出现。</p>
        <button disabled={busy} onClick={() => void finishJourney()}>
          {busy ? '正在抵达…' : '进入山门'}
        </button>
      </aside>
    );
  }

  return (
    <div className={styles.openingScreen}>
      <img className={styles.titleCard} src={storyAssets.video.titleCard} alt="红烛无声" />
      <div className={styles.titleVeil} aria-hidden="true" />
      <aside className={styles.choices} aria-label="选择旅程">
        <span>周末 · 午后</span>
        <h2>灯影寺，一夜之行</h2>
        <p>周末午后，四个人坐上开往山寺的大巴，准备离开城市一晚。</p>
        <button disabled={busy} onClick={() => setPhase('reel')}>
          {busy ? '正在准备…' : '开始旅程 · 第一幕'}
        </button>
        <button className={styles.resume} disabled={busy} onClick={() => void onResume()}>
          继续上次进度
        </button>
      </aside>
    </div>
  );
}
