import { Lantern, PerspectiveFloor } from '@/scene/story_art/common';
import { storyAssets } from '@/shared/lib/story_assets';

export function DawnGateArt({ id }: { id: string }) {
  return (
    <g>
      <rect width="1000" height="600" fill={`url(#${id}-sky)`} />
      <circle cx="839" cy="143" r="50" fill="#f7e6ac" opacity=".7" />
      <path
        d="M0 251L109 171 211 219 334 120 476 235 613 158 731 210 856 128 1000 214V440H0Z"
        fill="#789780"
        opacity=".55"
      />
      <path
        d="M0 286L194 218 302 275 458 200 612 280 752 230 1000 284V440H0Z"
        fill="#7f9580"
        opacity=".46"
      />
      <rect x="480" y="265" width="480" height="164" fill="#ccc6a0" />
      <path
        d="M425 271Q531 256 554 214L693 166 828 213Q866 250 981 270L946 292H458Z"
        fill={`url(#${id}-tiles)`}
      />
      <path d="M474 291H937" stroke="#394b3c" strokeWidth="11" />
      <path d="M593 292H808V429H593Z" fill="#314f43" />
      <path d="M583 292V436M818 292V436" stroke={`url(#${id}-wood)`} strokeWidth="21" />
      <rect
        x="631"
        y="275"
        width="134"
        height="37"
        fill="#44533c"
        stroke="#b5a05d"
        strokeWidth="3"
      />
      <text
        x="698"
        y="301"
        textAnchor="middle"
        fontSize="25"
        letterSpacing="8"
        fill="#e2d098"
        fontFamily="serif"
      >
        红烛寺
      </text>
      <rect x="837" y="258" width="29" height="72" fill="#8b8764" />
      <text
        x="851"
        y="268"
        writingMode="vertical-rl"
        fontSize="15"
        letterSpacing="5"
        fill="#cfc69b"
        fontFamily="serif"
      >
        明照寺
      </text>
      <PerspectiveFloor id={id} horizon={431} />
      <path d="M571 430H833L863 471H544Z" fill="#b8b497" />
      <path d="M559 444H843M550 458H852" stroke="#d5caac" strokeWidth="5" />
      <Lantern id={id} x={553} y={291} size={0.4} lit={false} />
      <g transform="translate(-86 235)">
        <path
          d="M0 34Q4 0 50 0H342Q377 0 382 33L389 229H0Z"
          fill="#e7e2c9"
          stroke="#b3b8a0"
          strokeWidth="5"
        />
        <path d="M0 47H276V141H0Z" fill="#537d76" stroke="#405e54" strokeWidth="7" />
        <path d="M92 46V142M181 46V142" stroke="#aeb8a0" strokeWidth="7" />
        <path d="M296 48H368V207H296Z" fill="#304e45" stroke="#7a8c76" strokeWidth="7" />
        <path d="M316 59V195M350 59V195" stroke="#cbbd78" strokeWidth="6" />
        <rect x="0" y="158" width="278" height="34" fill="#6e8f7a" />
        <circle cx="263" cy="224" r="35" fill="#34493f" />
        <circle cx="263" cy="224" r="22" fill="#9aa88e" />
        <text x="187" y="27" textAnchor="middle" fontSize="14" fill="#4e6c56" letterSpacing="4">
          周末 · 返程
        </text>
      </g>
      <path
        d="M917 0V249L883 301M918 140L962 188M920 95L865 136"
        stroke="#56674e"
        strokeWidth="20"
      />
      <path d="M850 0Q755 34 838 113Q945 137 1000 63V0Z" fill="#597e59" />
      <path
        d="M0 429Q481 383 1000 427V475Q481 452 0 480Z"
        fill="#e4e3ce"
        opacity=".3"
        data-fog="true"
      />
      <path
        d="M768 100q9-11 18 0q9-11 18 0M689 135q6-8 12 0q6-8 12 0"
        fill="none"
        stroke="#587969"
        strokeWidth="2"
      />
      <path d="M1000 104L593 600H889L1000 375Z" fill="#fff1b8" opacity=".11" />
    </g>
  );
}

export function DepartureArt(_props: { id: string }) {
  return (
    <image
      href={storyAssets.scenes.busDeparture}
      width="1000"
      height="600"
      preserveAspectRatio="xMidYMid slice"
    />
  );
}
