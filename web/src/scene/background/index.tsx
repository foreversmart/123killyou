import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

import { useEffect, useRef, useState } from 'react';
import { Application, Assets, Sprite } from 'pixi.js';
import { atmosphereFilter } from '../effects/atmosphere';
import type { GameState } from '@/shared/types/game';
import { ArrivalBackdrop } from '@/scene/arrival';

export function Scene({ state }: { state: GameState }) {
  if (state.sceneKey === 'mini_arrival') return <ArrivalBackdrop />;
  if (state.sceneKey) {
    return <StoryBackdrop state={state} />;
  }
  return <LegacyScene state={state} />;
}

function StoryBackdrop({ state }: { state: GameState }) {
  return (
    <div className={cx(styles['scene-art'], styles['scene-art--story'])}>
      <div className={styles['story-backdrop']}>
        <span>灯影寺 · 第一夜</span>
        <strong>{state.sceneName || '灯影寺'}</strong>
        <p>{state.sceneText || '先看清声源，再走下一步。'}</p>
      </div>
    </div>
  );
}

function LegacyScene({ state }: { state: GameState }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef(state);
  latest.current = state;
  const effectAt = useRef({
    revision: state.revision,
    started: performance.now(),
  });
  const background = state.room === 'watch' ? '/art/room-watch.webp' : '/art/room-corridor.webp';

  useEffect(() => {
    if (state.effect.kind !== 'none')
      effectAt.current = {
        revision: state.revision,
        started: performance.now(),
      };
  }, [state.revision, state.effect.kind]);

  useEffect(() => {
    const element = host.current!;
    const app = new Application();
    let disposed = false;
    let initialized = false;
    let observer: ResizeObserver | null = null;
    const boot = async () => {
      try {
        await app.init({
          resizeTo: element,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(devicePixelRatio, 2),
          preference: 'webgl',
        });
        initialized = true;
        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }
        element.append(app.canvas);
        app.canvas.setAttribute('aria-hidden', 'true');
        const textures = await Assets.load(['/art/room-watch.webp', '/art/room-corridor.webp']);
        if (disposed) return;
        const sprite = new Sprite(textures['/art/room-watch.webp']);
        sprite.anchor.set(0.5);
        const filter = atmosphereFilter();
        sprite.filters = [filter];
        app.stage.addChild(sprite);
        let previousRoom = '';
        const resize = () => {
          const scale = Math.max(
            app.screen.width / sprite.texture.width,
            app.screen.height / sprite.texture.height,
          );
          sprite.scale.set(scale);
          sprite.position.set(app.screen.width / 2, app.screen.height / 2);
        };
        observer = new ResizeObserver(() => {
          app.resize();
          resize();
        });
        observer.observe(element);
        const began = performance.now();
        app.ticker.add(() => {
          const game = latest.current;
          if (previousRoom !== game.room) {
            sprite.texture =
              textures[game.room === 'watch' ? '/art/room-watch.webp' : '/art/room-corridor.webp'];
            previousRoom = game.room;
            resize();
          }
          const elapsed = performance.now() - effectAt.current.started;
          const envelope =
            game.effect.kind !== 'none' && elapsed < game.effect.duration
              ? Math.sin((Math.PI * elapsed) / game.effect.duration) * game.effect.strength
              : 0;
          const uniforms = filter.resources.atmosphere.uniforms;
          uniforms.uTime = game.paused ? 0 : (performance.now() - began) / 1000;
          uniforms.uFear = Math.max(0, (68 - game.devotion) / 68);
          uniforms.uGlitch = game.effect.kind === 'glitch' ? envelope : 0;
          uniforms.uDizzy = game.effect.kind === 'dizzy' ? envelope : 0;
        });
        resize();
        setReady(true);
      } catch (error) {
        // The cropped room remains visible even when a GPU context is unavailable.
        console.warn('PixiJS 场景未能启动，保留静态房间画面。', error);
      }
    };
    void boot();
    return () => {
      disposed = true;
      observer?.disconnect();
      if (initialized) app.destroy(true, { children: true });
    };
  }, []);

  return (
    <div className={cx(styles['scene-art'], ready && styles['scene-art--ready'])}>
      <img
        className={styles['scene-fallback']}
        src={background}
        alt={
          state.room === 'watch'
            ? '守夜人坐在木桌后，桌上摆着登记册和油灯，身后的门通往走廊。'
            : '昏暗的走廊。左侧休息室亮着灯，内堂的门紧闭。'
        }
      />
      <div className={styles['pixi-host']} ref={host} />
    </div>
  );
}
