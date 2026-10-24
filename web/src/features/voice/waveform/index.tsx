import { useEffect, useRef } from 'react';
import type { VoiceStatus } from '../useVoice';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function Waveform({ level, status }: { level: () => number; status: VoiceStatus | 'demo' }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const render = (now: number) => {
      const amplitude = level();
      const active = status === 'speaking' || status === 'demo';
      host.current?.querySelectorAll<HTMLElement>('i').forEach((bar, index) => {
        const center = 1 - Math.abs(index - 16) / 18;
        const motion = active
          ? (Math.sin(index * 0.81 + now * 0.005) + 1) * 0.23
          : amplitude * (Math.sin(index * 0.9 + now * 0.004) + 1);
        bar.style.transform = `scaleY(${0.08 + center * (0.12 + motion)})`;
      });
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [level, status]);
  return (
    <div
      className={cx(styles.waveform, (status === 'idle' || status === 'error') && styles.inactive)}
      ref={host}
      aria-hidden="true"
    >
      {Array.from({ length: 33 }, (_, index) => (
        <i key={index} />
      ))}
    </div>
  );
}
