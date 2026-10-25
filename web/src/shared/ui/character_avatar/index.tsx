import { useId } from 'react';
import { cx } from '@/shared/lib/cx';
import styles from './style.module.css';

export function CharacterAvatar({
  id,
  name,
  portrait = false,
  eerie = false,
}: {
  id: string;
  name: string;
  portrait?: boolean;
  eerie?: boolean;
}) {
  const gradient = useId().replaceAll(':', '');
  const monk = ['keeper', 'luchen', 'huipu', 'shangong'].includes(id);
  const female = ['linlan', 'xuzhi'].includes(id);
  return (
    <svg
      className={cx(styles.figure, portrait && styles.portrait, eerie && styles.eerie)}
      data-character={id}
      viewBox={portrait ? '7 0 86 100' : '0 0 100 210'}
      role="img"
      aria-label={`${name}${portrait ? '头像' : '在场人物'}`}
    >
      <defs>
        <linearGradient id={gradient} x2="1" y2="0.7">
          <stop stopColor="var(--fabric-light)" />
          <stop offset="1" stopColor="var(--fabric)" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="203" rx="31" ry="5" fill="#0005" />
      {female && <path d="M26 32Q16 6 51 4Q85 7 75 48L73 88H26Z" fill="#292d2c" />}
      <path d="M38 49H62V68H38Z" fill="#b79779" />
      <path
        d="M32 66L17 79L5 135L17 143L31 104L27 177H73L69 104L82 142L95 135L82 79L66 66Z"
        fill={`url(#${gradient})`}
        stroke="#222b3033"
        strokeWidth="2"
      />
      {monk ? (
        <>
          <path d="M40 64L70 81L82 189H18L31 89Z" fill={`url(#${gradient})`} />
          <path
            d="M37 72L68 94L58 170M30 102L66 119"
            fill="none"
            stroke="#f7deb529"
            strokeWidth="3"
          />
          <path
            d="M28 78Q45 115 69 80"
            fill="none"
            stroke="#443d2e"
            strokeWidth="4"
            strokeDasharray="1 6"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path d="M28 166H72L71 201H55L50 178L45 201H29Z" fill="#3c4949" />
      )}
      <ellipse cx="50" cy="30" rx="22" ry="27" fill="#ceb293" />
      {!monk && (
        <path
          d={
            female
              ? 'M27 30Q21 0 53 4Q78 5 73 31L60 16L43 19L29 40Z'
              : 'M27 25Q23 0 52 4Q80 1 74 31L65 19L43 18L28 34Z'
          }
          fill="#303635"
        />
      )}
      <path d="M38 31h5m15 0h5" stroke="#414239" strokeWidth="2" />
      <path d="M49 34l-2 8h6m-11 7q8 4 16-1" fill="none" stroke="#93735e" strokeWidth="1.5" />
      {id === 'zhouyan' && (
        <g fill="none" stroke="#4a514b" strokeWidth="2">
          <rect x="32" y="25" width="15" height="12" rx="3" />
          <rect x="53" y="25" width="15" height="12" rx="3" />
          <path d="M47 29h6" />
        </g>
      )}
      {id === 'linlan' && (
        <g transform="translate(30 86)">
          <path d="M-8-19L20 3L42-22" fill="none" stroke="#393c36" strokeWidth="3" />
          <rect width="39" height="26" rx="4" fill="#34433f" />
          <circle cx="20" cy="13" r="10" fill="#87a5a1" stroke="#222b29" strokeWidth="4" />
        </g>
      )}
      {id === 'xuzhi' && (
        <>
          <path d="M71 21Q88 15 80 32" fill="none" stroke="#73a3c8" strokeWidth="6" />
          <path d="M22 102L43 134L31 157L10 130Z" fill="#a98d68" stroke="#d9c097" />
        </>
      )}
      {id === 'zhouyan' && <path d="M54 100l29 8-8 43-30-8Z" fill="#dad0ad" stroke="#897e61" />}
      {id === 'huipu' && (
        <path
          d="M52 75L65 183M29 120L75 132"
          stroke="#917357"
          fill="none"
          strokeDasharray={eerie ? '3 5' : undefined}
          strokeWidth="3"
        />
      )}
      {eerie && (
        <path
          d="M47 57l4 35-6 32 5 52"
          stroke="#67434a"
          strokeWidth="2"
          strokeDasharray="3 4"
          fill="none"
        />
      )}
    </svg>
  );
}
