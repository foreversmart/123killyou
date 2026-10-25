export function ArtDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-wood`} x2="1" y2="0">
        <stop stopColor="#3a2b25" />
        <stop offset=".28" stopColor="#756047" />
        <stop offset=".64" stopColor="#554333" />
        <stop offset="1" stopColor="#322823" />
      </linearGradient>
      <linearGradient id={`${id}-wall`} x2="0" y2="1">
        <stop stopColor="#a29c7b" />
        <stop offset="1" stopColor="#686d59" />
      </linearGradient>
      <linearGradient id={`${id}-night`} x2="0" y2="1">
        <stop stopColor="#243543" />
        <stop offset=".6" stopColor="#192c37" />
        <stop offset="1" stopColor="#111d26" />
      </linearGradient>
      <linearGradient id={`${id}-stone`} x2="1" y2="1">
        <stop stopColor="#758175" />
        <stop offset=".5" stopColor="#455751" />
        <stop offset="1" stopColor="#253f42" />
      </linearGradient>
      <linearGradient id={`${id}-sky`} x2="0" y2="1">
        <stop stopColor="#9fc4c6" />
        <stop offset="1" stopColor="#e5d7ac" />
      </linearGradient>
      <radialGradient id={`${id}-warm`}>
        <stop stopColor="#ffe5a0" stopOpacity=".65" />
        <stop offset=".3" stopColor="#ebb95d" stopOpacity=".25" />
        <stop offset="1" stopColor="#d7a960" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-moon`}>
        <stop stopColor="#c6dcd9" stopOpacity=".26" />
        <stop offset="1" stopColor="#b9d2d9" stopOpacity="0" />
      </radialGradient>
      <pattern id={`${id}-paper`} width="18" height="18" patternUnits="userSpaceOnUse">
        <rect width="18" height="18" fill="#b6b59a" />
        <path d="M0 4h9m3 9h6M4 0v3m6 12v6" stroke="#737e67" strokeOpacity=".14" />
      </pattern>
      <pattern id={`${id}-planks`} width="82" height="120" patternUnits="userSpaceOnUse">
        <rect width="82" height="120" fill="#394645" />
        <path d="M0 0v120M81 0v120M0 60h82" stroke="#172b2f" strokeWidth="2" />
        <path
          d="M8 0v120M17 5v42m0 22v50m36-115v120M67 10v100"
          stroke="#b8b08c"
          strokeOpacity=".1"
        />
      </pattern>
      <pattern id={`${id}-tiles`} width="36" height="18" patternUnits="userSpaceOnUse">
        <rect width="36" height="18" fill="#3b514c" />
        <path d="M0 0v18M18 0v18M0 16h36M0 3h36" stroke="#93a08a" strokeOpacity=".35" />
      </pattern>
    </defs>
  );
}

export function Lantern({
  id,
  x,
  y,
  size = 1,
  lit = true,
}: {
  id: string;
  x: number;
  y: number;
  size?: number;
  lit?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {lit && <ellipse cx="0" cy="22" rx="76" ry="105" fill={`url(#${id}-warm)`} />}
      <path d="M0-25V0M-19 5h38M-17 49h34" stroke="#30332b" strokeWidth="4" />
      <path
        d="M-17 7Q-23 29-14 47H14Q23 29 17 7Z"
        fill={lit ? '#d5b76e' : '#53605a'}
        stroke="#92845c"
        strokeWidth="2"
      />
      <path d="M-9 9v35M0 8v37M9 9v35" stroke="#5e5b3c" strokeOpacity=".5" />
      <path d="M0 49v15M-7 64H7" stroke="#42493c" strokeWidth="3" />
      {lit && <path data-flame="true" d="M0 20Q-9 33 0 37Q9 33 0 20" fill="#fff3b1" />}
    </g>
  );
}

export function LatticeWindow({
  id,
  x,
  y,
  width = 160,
  height = 150,
  night = false,
}: {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  night?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-7" y="-7" width={width + 14} height={height + 14} fill={`url(#${id}-wood)`} />
      <rect width={width} height={height} fill={night ? '#28434b' : `url(#${id}-paper)`} />
      {Array.from({ length: 5 }, (_, i) => (
        <path
          key={`v${i}`}
          d={`M${(i * width) / 4} 0v${height}`}
          stroke={night ? '#243832' : '#646a4f'}
          strokeWidth="5"
        />
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <path
          key={`h${i}`}
          d={`M0 ${(i * height) / 3}h${width}`}
          stroke={night ? '#243832' : '#646a4f'}
          strokeWidth="5"
        />
      ))}
      <path
        d={`M0 0L${width} ${height}M${width} 0L0 ${height}`}
        stroke={night ? '#233b39' : '#777c5b'}
        strokeWidth="3"
      />
    </g>
  );
}

export function PerspectiveFloor({
  id,
  horizon = 370,
  night = false,
}: {
  id: string;
  horizon?: number;
  night?: boolean;
}) {
  return (
    <g>
      <path d={`M0 ${horizon}H1000V600H0Z`} fill={night ? '#314346' : '#b8ad8c'} />
      {[0, 120, 260, 420, 580, 740, 880, 1000].map((x) => (
        <path
          key={x}
          d={`M500 ${horizon - 90}L${x} 600`}
          stroke={night ? '#78928a' : '#5f705a'}
          strokeOpacity=".25"
        />
      ))}
      {[horizon + 22, horizon + 58, horizon + 110, horizon + 183].map((y) => (
        <path
          key={y}
          d={`M0 ${y}H1000`}
          stroke={night ? '#90a095' : '#5a6653'}
          strokeOpacity=".27"
        />
      ))}
      <path d={`M0 ${horizon + 3}H1000`} stroke="#1b302c" strokeOpacity=".35" strokeWidth="5" />
      <path
        d="M765 600L630 458 586 426 557 394"
        stroke={night ? '#101b21' : '#5d5c4a'}
        strokeWidth="5"
        opacity=".28"
        fill="none"
      />
      <path
        d="M773 600L639 458 595 426 566 394"
        stroke={night ? '#889084' : '#e2cfa4'}
        strokeWidth="2"
        opacity=".25"
        fill="none"
      />
      <rect width="1000" height="600" fill={`url(#${id}-moon)`} opacity={night ? '.24' : '0'} />
    </g>
  );
}
