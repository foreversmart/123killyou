import styles from './style.module.css';

import { useEffect, useRef, useState } from 'react';
import { Application, Sprite, Texture } from 'pixi.js';
import { atmosphereFilter } from '../effects/atmosphere';

type ExperimentalCanvas = HTMLCanvasElement & { requestPaint: () => void };
type ExperimentalContext = CanvasRenderingContext2D & {
  drawElementImage: (element: HTMLElement, x: number, y: number) => unknown;
};

function LedgerText() {
  return (
    <article className={styles['ledger-paper']}>
      <span className={styles['paper-eyebrow']}>值夜登记 · 残录</span>
      <h2>第三声钟响后</h2>
      <div className={styles['ledger-lines']}>
        <p>子时　内堂封门，外人止步。</p>
        <p>
          丑时　<span className={styles['crossed-name']}>林　生</span>　已归。
        </p>
        <p>寅时　值夜人不得离席。</p>
      </div>
      <p className={styles['handwritten']}>“第三声钟响后，不可回头。”</p>
      <span className={styles['paper-seal']}>已阅</span>
    </article>
  );
}

export function HtmlClue() {
  const [renderState, setRenderState] = useState<'loading' | 'active' | 'error'>('loading');
  const source = useRef<HTMLCanvasElement>(null);
  const target = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!source.current || !target.current) return;
    const canvas = source.current as ExperimentalCanvas;
    const element = canvas.firstElementChild as HTMLElement;
    if ('content' in HTMLCanvasElement.prototype) canvas.setAttribute('content', 'drawable');
    else canvas.setAttribute('layoutsubtree', '');
    element.setAttribute('drawable', '');
    const ctx = canvas.getContext('2d') as ExperimentalContext;
    const app = new Application();
    let dead = false;
    let initialized = false;
    let failed = false;
    let texture: Texture | null = null;
    const fail = (error: unknown) => {
      if (dead || failed) return;
      failed = true;
      clearTimeout(timeout);
      if (initialized) app.stop();
      setRenderState('error');
      console.warn('HTML-in-Canvas 未能绘制:', error);
    };
    const timeout = setTimeout(() => fail(new Error('等待账本绘制超时')), 5000);
    const paint = () => {
      if (dead || failed) return;
      try {
        if (!ctx) throw new Error('无法创建 Canvas 2D 上下文');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawElementImage(element, 0, 0);
        if (texture) {
          texture.source.update();
          app.render();
          clearTimeout(timeout);
          setRenderState('active');
        }
      } catch (error) {
        fail(error);
      }
    };
    canvas.addEventListener('paint', paint);
    const boot = async () => {
      try {
        await app.init({
          width: 720,
          height: 460,
          backgroundAlpha: 0,
          antialias: true,
          preference: 'webgl',
        });
        initialized = true;
        if (dead || failed) {
          app.destroy(true);
          initialized = false;
          return;
        }
        texture = Texture.from(canvas);
        const sprite = new Sprite(texture);
        const filter = atmosphereFilter();
        sprite.filters = [filter];
        app.stage.addChild(sprite);
        target.current!.append(app.canvas);
        app.canvas.style.width = '100%';
        app.canvas.style.height = '100%';
        app.ticker.add((ticker) => {
          filter.resources.atmosphere.uniforms.uTime += ticker.deltaMS / 1000;
        });
        canvas.requestPaint();
      } catch (error) {
        fail(error);
      }
    };
    void boot();
    try {
      canvas.requestPaint();
    } catch (error) {
      fail(error);
    }
    return () => {
      dead = true;
      clearTimeout(timeout);
      canvas.removeEventListener('paint', paint);
      if (initialized) app.destroy(true, { children: true });
      texture?.destroy(true);
    };
  }, []);
  return (
    <div
      className={styles['ledger-capture']}
      data-html-canvas={renderState}
      aria-busy={renderState === 'loading'}
    >
      <canvas className={styles['html-source']} ref={source} width={720} height={460}>
        <LedgerText />
      </canvas>
      <div className={styles['html-pixi-target']} ref={target} />
      {renderState !== 'active' && (
        <p
          className={styles['render-feedback']}
          role={renderState === 'error' ? 'alert' : 'status'}
        >
          {renderState === 'error'
            ? '账本画面暂时未能显示。请说“返回”，再重新打开账本。'
            : '正在辨认纸上的字迹……'}
        </p>
      )}
    </div>
  );
}
