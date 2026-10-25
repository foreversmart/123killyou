import type { CSSProperties } from 'react';
import type { SceneActor } from '@/shared/types/game';
import type { ActorPlacement } from '@/scene/story_stage/types';
import { CharacterAvatar } from '@/shared/ui/character_avatar';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';
import { BackFigure } from './back_figure';
import { DeathFigure } from './death_figure';

export function ScenePerson({
  actor,
  placement,
  speaking,
  pose,
}: {
  actor: SceneActor;
  placement: ActorPlacement;
  speaking: boolean;
  pose?: string;
}) {
  const id = actor.portrait || actor.id;
  const disguised = actor.id.includes('double');
  const calm = disguised && pose === 'double_calm';
  return (
    <div
      className={cx(styles.person, speaking && styles.speaking)}
      data-actor={actor.id}
      data-concealed={actor.position.includes('帘后')}
      data-stone={actor.id === 'shangong' && pose === 'oracle_stone'}
      data-calm={calm}
      aria-label={`${actor.name}，${actor.position}，${actor.status}${speaking ? '，正在说话' : ''}`}
      style={
        {
          left: `${placement.x}%`,
          top: `${placement.y}%`,
          '--height': `${placement.height || 32}%`,
          '--facing': placement.facing === 'left' ? -1 : 1,
        } as CSSProperties
      }
    >
      <div className={styles.body}>
        {actor.id === 'evil' ? (
          <DeathFigure pose={pose} />
        ) : calm ? (
          <CalmFigure id={id} name={actor.name} />
        ) : actor.id === 'huipu' && pose?.startsWith('listen_') ? (
          <BackFigure />
        ) : (
          <CharacterAvatar
            id={id === 'luchen' ? 'keeper' : id}
            name={actor.name}
            eerie={disguised || (actor.id === 'huipu' && actor.status.includes('剥'))}
          />
        )}
      </div>
      <div className={styles.label}>
        <b>
          {actor.name}
          {speaking && <i aria-label="声源"> ···</i>}
        </b>
        <span>{actor.position}</span>
      </div>
    </div>
  );
}

function CalmFigure({ id, name }: { id: string; name: string }) {
  const fabric = id === 'linlan' ? '#a9b49f' : id === 'zhouyan' ? '#88a79b' : '#ac8e83';
  return (
    <svg viewBox="0 0 180 100" role="img" aria-label={`${name}蜷伏在床脚，双手贴地`}>
      <ellipse cx="92" cy="88" rx="76" ry="7" fill="#101e22" opacity=".45" />
      <path d="M107 61Q137 47 150 65L165 85H128L112 75Z" fill="#3c4949" />
      <path d="M151 80L167 80 174 87 155 90 143 87Z" fill="#2d3939" />
      <path
        d="M49 47Q79 30 111 51L134 79Q107 91 61 80L46 68Z"
        fill={fabric}
        stroke="#222f30"
        strokeWidth="2"
      />
      <path d="M64 53Q63 69 44 77L22 79 23 85H62L84 64" fill={fabric} stroke="#d2bba0" />
      <path d="M22 79L10 82 13 88H32L34 82Z" fill="#cbb092" />
      <path d="M44 46L57 51 51 67 37 60Z" fill="#b99a7e" />
      <ellipse cx="35" cy="47" rx="21" ry="18" transform="rotate(24 35 47)" fill="#ceb293" />
      <path d="M15 43Q11 22 37 26Q60 29 55 48L39 37 20 48Z" fill="#303635" />
      <path d="M23 48l6 3m8 1 5 3" stroke="#4b4b40" strokeWidth="1.8" />
      {id === 'zhouyan' && (
        <g fill="none" stroke="#4a514b" strokeWidth="1.5" transform="rotate(20 34 49)">
          <rect x="21" y="44" width="11" height="9" rx="2" />
          <rect x="36" y="44" width="11" height="9" rx="2" />
          <path d="M32 47H36" />
        </g>
      )}
      {id === 'xuzhi' && <path d="M48 30q12-5 9 6" fill="none" stroke="#73a3c8" strokeWidth="5" />}
      {id === 'linlan' && (
        <path d="M68 49L86 80 104 60" fill="none" stroke="#3f4a43" strokeWidth="3" />
      )}
      <path d="M91 46L102 62 96 81" stroke="#d7c4a1" opacity=".3" fill="none" />
    </svg>
  );
}
