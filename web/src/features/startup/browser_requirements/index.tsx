import { useState } from 'react';
import { Icon } from '@/shared/ui/icon';
import styles from './style.module.css';

const flags = [
  { name: 'HTML-in-Canvas', url: 'chrome://flags/#canvas-draw-element' },
  {
    name: 'Experimental Web Platform features',
    url: 'chrome://flags/#enable-experimental-web-platform-features',
  },
];

export function BrowserRequirements({ missing }: { missing: string[] }) {
  const [message, setMessage] = useState('');
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('地址已复制。请粘贴到 Chrome 地址栏打开。');
    } catch {
      setMessage('未能复制，请选中上方地址，手动复制到 Chrome 地址栏。');
    }
  };

  return (
    <main className={styles['startup-screen']} data-browser-requirements="blocked">
      <section className={styles['requirements-card']} aria-labelledby="requirements-title">
        <header className={styles['card-header']}>
          <span className={styles['wordmark']}>
            <Icon kind="seal" />
            第一夜
          </span>
          <span className={styles['status-badge']}>实验功能未开启</span>
        </header>
        <div className={styles['card-body']}>
          <p className={styles['eyebrow']}>进入之前 · 浏览器检查</p>
          <h1 id="requirements-title">请先开启浏览器实验功能</h1>
          <p className={styles['intro']}>
            本作需要 HTML-in-Canvas 来呈现文字与画面的特效。检测通过后，才能进入游戏。
          </p>
          <ol className={styles['steps']}>
            {flags.map((flag) => (
              <li key={flag.url}>
                <div className={styles['step-heading']}>
                  <span>{flag.name}</span>
                  <span className={styles['enable-label']}>设为 Enabled</span>
                </div>
                <div className={styles['flag-address']}>
                  <code>{flag.url}</code>
                  <button
                    type="button"
                    onClick={() => void copy(flag.url)}
                    aria-label={`复制 ${flag.name} 地址`}
                  >
                    复制地址
                  </button>
                </div>
              </li>
            ))}
            <li className={styles['restart-step']}>
              点击浏览器提示的 <strong>Relaunch</strong> 重启，再打开本页。
            </li>
          </ol>
          <p className={styles['browser-tip']}>
            请将地址粘贴到浏览器地址栏。如果找不到开关，请使用最新版 Chrome Canary。
          </p>
          <div className={styles['actions']}>
            <button
              className={styles['retry-button']}
              type="button"
              onClick={() => location.reload()}
            >
              已开启，刷新检测 <span aria-hidden="true">↻</span>
            </button>
            <a
              href="https://github.com/WICG/html-in-canvas#developer-trial-information"
              target="_blank"
              rel="noreferrer"
            >
              查看启用说明 ↗
            </a>
          </div>
          <p className={styles['copy-feedback']} role="status">
            {message}
          </p>
          <details className={styles['diagnostics']}>
            <summary>查看检测信息</summary>
            <p>尚未提供以下必需 API：</p>
            <ul>
              {missing.map((name) => (
                <li key={name}>
                  <code>{name}</code>
                </li>
              ))}
            </ul>
          </details>
        </div>
        <footer className={styles['card-footer']}>固定视角 · 全程语音 · 第一夜</footer>
      </section>
    </main>
  );
}
