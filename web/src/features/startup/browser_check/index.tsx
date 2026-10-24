import { useEffect, useRef } from 'react';
import type { HtmlCanvasSupport } from '@/shared/lib/htmlCanvas';
import { probeHtmlCanvasSupport } from '@/shared/lib/htmlCanvasProbe';
import { Icon } from '@/shared/ui/icon';
import styles from './style.module.css';

export function BrowserCheck({ onComplete }: { onComplete: (result: HtmlCanvasSupport) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let attempt: AbortController | undefined;
    const check = () => {
      attempt?.abort();
      if (document.visibilityState !== 'visible' || !host.current) return;
      const current = new AbortController();
      attempt = current;
      void probeHtmlCanvasSupport(host.current, { signal: current.signal })
        .then((result) => {
          if (!current.signal.aborted) onComplete(result);
        })
        .catch((error: unknown) => {
          if (!current.signal.aborted) {
            onComplete({
              supported: false,
              missing: [],
              error: `绘制检测未能完成：${error instanceof Error ? error.message : String(error)}`,
            });
          }
        });
    };
    document.addEventListener('visibilitychange', check);
    check();
    return () => {
      attempt?.abort();
      document.removeEventListener('visibilitychange', check);
    };
  }, [onComplete]);

  return (
    <main className={styles['check-screen']} data-browser-requirements="checking" aria-busy="true">
      <Icon kind="seal" />
      <p role="status">正在验证画面绘制……</p>
      <div className={styles['probe-host']} ref={host} aria-hidden="true" />
      <small>请保持页面在前台，检测通过后进入游戏</small>
    </main>
  );
}
