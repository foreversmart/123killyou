import { useState } from 'react';
import { primeAudioContext } from '@/features/voice/playbackContext';
import { Icon } from '@/shared/ui/icon';
import styles from './style.module.css';

export function VoiceSetup({ onComplete }: { onComplete: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const activate = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw new Error('语音需要在 HTTPS 或 localhost 页面中启动。');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream.getTracks().forEach((track) => track.stop());
      await primeAudioContext();
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '无法启动麦克风，请检查浏览器权限。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles['voice-screen']} aria-labelledby="voice-setup-title">
      <section className={styles.card}>
        <Icon kind="seal" />
        <p className={styles.eyebrow}>画面能力已通过 · 最后一步</p>
        <h1 id="voice-setup-title">开启语音会话</h1>
        <p className={styles.intro}>
          游戏全程使用语音操作。现在先允许麦克风并启动音频，进入后开场片头会自动播放。
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button type="button" onClick={() => void activate()} disabled={busy}>
          {busy ? '正在准备语音…' : '允许麦克风并进入'}
          <span aria-hidden="true">→</span>
        </button>
        <small>只在本次游戏会话中使用麦克风；之后按住空格说话。</small>
      </section>
    </main>
  );
}
