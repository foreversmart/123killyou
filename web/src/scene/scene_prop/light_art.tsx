import { useId } from 'react';
export function LightArt({ kind, lit }: { kind: 'candle' | 'lamp'; lit?: boolean }) {
  const glow = useId().replaceAll(':', '');
  return (
    <>
      <defs>
        <radialGradient id={glow}>
          <stop stopColor="#ffe39c" stopOpacity="0.6" />
          <stop offset="1" stopColor="#f1a53e" stopOpacity="0" />
        </radialGradient>
      </defs>
      {kind === 'candle' && (
        <>
          {lit && (
            <>
              <circle cx="60" cy="38" r="48" fill={`url(#${glow})`} />
              <path d="M59 7Q80 35 62 44Q43 39 59 7" fill="#f4be63" />
              <path d="M60 23Q70 39 60 40Q52 38 60 23" fill="#fff4ba" />
            </>
          )}
          {!lit && <path d="M60 35q-5-12 2-20" stroke="#b9b5a366" strokeWidth="2" fill="none" />}
          <ellipse cx="60" cy="85" rx="24" ry="7" fill="#8e7860" />
          <path d="M49 43h22v40q-11 8-22 0Z" fill="#a5433a" stroke="#d47c5f" />
          <path d="M54 46v26m9-21v18" stroke="#f3af8166" strokeWidth="3" />
          <path d="M60 42v-6" stroke="#2f2d29" strokeWidth="2" />
        </>
      )}
      {kind === 'lamp' && (
        <>
          <path d="M45 83h30l-7-12H52Z" fill="#7c7760" />
          <path d="M39 66q21 15 42 0l-7-29H46Z" fill="#baa771" stroke="#e7ce93" />
          <path d="M60 31q19 29 0 30q-19-1 0-30" fill="#f6c671" />
          <path
            d="M49 20Q29 45 42 63m29-43q21 25 7 43"
            fill="none"
            stroke="#b2a886"
            strokeWidth="3"
          />
        </>
      )}
    </>
  );
}
