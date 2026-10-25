import type React from 'react';
import type { SceneComposition, SceneLayer } from './types';
import styles from './style.module.css';

export function AuthoredScene({ composition }: { composition: SceneComposition }) {
  const { width, height } = composition;
  return (
    <div className={styles.scene} aria-hidden="true">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          {composition.layers
            .filter((layer) => layer.clipRect)
            .map((layer) => (
              <clipPath id={`clip-${layer.id}`} key={`clip-${layer.id}`}>
                <rect {...layer.clipRect} />
              </clipPath>
            ))}
        </defs>
        {composition.layers.map((layer) => (
          <Layer key={layer.id} layer={layer} />
        ))}
        {composition.labels.map((label) => (
          <text
            key={label.id}
            x={label.x}
            y={label.y}
            fill={label.color}
            fontFamily={label.fontFamily}
            fontSize={label.fontSize}
            textAnchor={label.align === 'center' ? 'middle' : undefined}
            dominantBaseline={
              label.baseline as React.SVGAttributes<SVGTextElement>['dominantBaseline']
            }
            transform={
              label.rotation
                ? `rotate(${(label.rotation * 180) / Math.PI} ${label.x} ${label.y})`
                : undefined
            }
            style={{ zIndex: label.zIndex }}
          >
            {label.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Layer({ layer }: { layer: SceneLayer }) {
  const { frame, rect } = layer;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return (
    <g
      data-layer={layer.id}
      data-actor-id={layer.actorId || undefined}
      transform={layer.rotation ? `rotate(${layer.rotation} ${centerX} ${centerY})` : undefined}
      clipPath={layer.clipRect ? `url(#clip-${layer.id})` : undefined}
    >
      <svg
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
        preserveAspectRatio="none"
      >
        <image
          href={layer.src}
          x={0}
          y={0}
          width={layer.imageWidth}
          height={layer.imageHeight}
          preserveAspectRatio="none"
        />
      </svg>
    </g>
  );
}

export function hasAuthoredScene(composition: SceneComposition | undefined): boolean {
  return Boolean(composition?.layers.length);
}

export type { SceneComposition } from './types';
export { dayScene } from './day_scenes';
export { nightScene } from './night_scenes';
