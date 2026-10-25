import type { GameState } from '@/shared/types/game';
import { Lantern, LatticeWindow, PerspectiveFloor } from '@/scene/story_art/common';

export function RefectoryArt({ id, state }: { id: string; state: GameState }) {
  const close = state.shotKey === 'refectory_porridge';
  return (
    <g>
      <rect width="1000" height="600" fill="#827e61" />
      <path d="M0 0H1000V152H0Z" fill="#4e5845" />
      <path d="M0 41L1000 94M0 92L1000 131" stroke="#313f36" strokeWidth="19" />
      <PerspectiveFloor id={id} horizon={350} />
      <LatticeWindow id={id} x={71} y={160} width={220} height={180} />
      <LatticeWindow id={id} x={350} y={160} width={160} height={180} />
      <path d="M89 163L384 600H570L251 163Z" fill="#f8dba0" opacity=".17" />
      <path d="M361 166L650 600H725L489 166Z" fill="#f9d190" opacity=".1" />
      <rect x="620" y="118" width="332" height="255" fill="#263c33" />
      <path d="M609 121H966" stroke="#3e4936" strokeWidth="15" />
      <path d="M624 127Q720 165 753 121L714 358 618 378Z" fill="#656a4a" />
      <path d="M952 127Q853 165 822 121L860 358 957 378Z" fill="#50583e" />
      <path
        d="M642 150L633 357M666 159L653 352M693 157L674 347M931 153L939 355M906 161L920 352M881 159L899 348"
        stroke="#b8ac77"
        strokeWidth="3"
        opacity=".18"
      />
      <Lantern id={id} x={790} y={155} size={0.65} />
      <path d="M22 153V392M560 130V381M978 128V387" stroke={`url(#${id}-wood)`} strokeWidth="25" />
      <rect x="566" y="228" width="33" height="112" fill="#454c37" stroke="#a79b67" />
      <text
        x="583"
        y="241"
        writingMode="vertical-rl"
        fontSize="14"
        fill="#d2c28f"
        letterSpacing="6"
      >
        食时不语
      </text>
      <ellipse cx="477" cy="512" rx="350" ry="39" fill="#354638" opacity=".32" />
      <path d="M254 369L673 360 850 488 136 501Z" fill="#987e52" stroke="#665b3d" strokeWidth="5" />
      <path d="M136 501L850 488V508L136 523Z" fill="#67583d" />
      <path
        d="M172 520L158 590M815 507L831 580M298 393L305 527M661 385L670 533"
        stroke="#514b34"
        strokeWidth="18"
      />
      <path
        d="M226 398L714 394M193 426L747 419M166 457L792 452M157 487L827 477"
        stroke="#5a563a"
        strokeOpacity=".3"
        strokeWidth="2"
      />
      {[
        { x: 335, y: 405, name: '林' },
        { x: 567, y: 400, name: '周' },
        { x: 663, y: 464, name: '许' },
        { x: 365, y: 470, name: '你' },
      ].map((bowl) => (
        <g key={bowl.name}>
          <path
            d={`M${bowl.x - 30} ${bowl.y}q3 32 30 32t30-32Z`}
            fill="#b8b49b"
            stroke="#526557"
            strokeWidth="2"
          />
          <ellipse
            cx={bowl.x}
            cy={bowl.y}
            rx="31"
            ry="10"
            fill="#c8bc8e"
            stroke="#e2d1a0"
            strokeWidth="2"
          />
          <ellipse cx={bowl.x} cy={bowl.y} rx="20" ry="6" fill="#b4a56f" />
          <path
            d={`M${bowl.x - 8} ${bowl.y - 1}l16 2m-9-4l-4 7`}
            stroke="#d3c083"
            strokeWidth="2"
          />
          <path
            d={`M${bowl.x - 5} ${bowl.y - 14}q-8-10 0-19m11 20q-7-8 0-15`}
            fill="none"
            stroke="#f6e6bc"
            opacity=".3"
          />
          <text x={bowl.x} y={bowl.y + 25} textAnchor="middle" fontSize="12" fill="#475744">
            {bowl.name}
          </text>
        </g>
      ))}
      <g transform="translate(480 446)">
        <ellipse rx="40" ry="13" fill="#59664a" />
        <ellipse ry="9" rx="34" fill="#d2bd7c" />
        <path d="M-23-2l14 4m6-5 14 6m3-3 13 0" stroke="#8e7b4e" strokeWidth="3" />
      </g>
      <path d="M749 423v-36q-7-11-15-2v38Z" fill="#bec0a0" stroke="#65725d" strokeWidth="2" />
      <path d="M751 391q25-5 17 19h-17" fill="none" stroke="#8d9a7b" strokeWidth="4" />
      <ellipse cx="247" cy="464" rx="31" ry="10" fill="#5f7159" />
      <path d="M226 463l14 2 8-4 12 3 6-4" fill="none" stroke="#ac9a5d" strokeWidth="5" />
      {close && (
        <g>
          <path d="M0 566Q250 516 500 545T1000 551V600H0Z" fill="#3c4a3e" opacity=".6" />
          <path
            d="M273 572Q295 509 371 512Q455 509 485 572"
            fill="#948868"
            stroke="#c7b28b"
            strokeWidth="8"
          />
          <ellipse cx="378" cy="540" rx="79" ry="24" fill="#cfc18b" />
          <path
            d="M341 537Q370 518 395 539M365 547L389 532"
            stroke="#a1745d"
            strokeWidth="5"
            fill="none"
          />
          <path d="M428 532L492 498" stroke="#777d65" strokeWidth="10" />
        </g>
      )}
      <rect width="1000" height="600" fill={`url(#${id}-warm)`} opacity=".18" />
    </g>
  );
}
