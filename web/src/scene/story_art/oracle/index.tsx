import type { GameState } from '@/shared/types/game';
import { Lantern, PerspectiveFloor } from '@/scene/story_art/common';

export function OracleArt({ id, state }: { id: string; state: GameState }) {
  const stone = state.shotKey === 'oracle_stone' || state.shotKey === 'death_mini_oracle';
  const rescue = state.shotKey === 'oracle_rescue';
  return (
    <g>
      <rect width="1000" height="600" fill="#1b2f31" />
      <path d="M89 91H922V406H89Z" fill="#35473e" />
      <path d="M165 141H853V354H165Z" fill="#283d36" stroke="#726f4c" strokeWidth="3" />
      <path d="M170 153H848V185H170Z" fill="#334133" />
      <path d="M0 0H1000V94L0 130Z" fill="#14272b" />
      <path d="M0 81H1000M0 105H1000" stroke="#57604a" strokeWidth="16" />
      <PerspectiveFloor id={id} horizon={406} night />
      <g transform="translate(677 244)">
        <path
          d="M-114 123Q-106 18-37-28H37Q106 18 114 123Z"
          fill={`url(#${id}-stone)`}
          stroke="#81907a"
          strokeWidth="3"
        />
        <path
          d="M-44-27Q-63-90-35-115Q0-144 35-115Q63-90 44-27L28-13H-28Z"
          fill={`url(#${id}-stone)`}
          stroke="#81907a"
          strokeWidth="3"
        />
        <path
          d="M-37-107q37-24 74 0M-37-95q37-21 74 0M-24-76h14m20 0h14M0-74v23l7 3M-13-35q13 7 26 0"
          stroke="#18352f"
          strokeWidth="4"
          fill="none"
        />
        <path
          d="M-67 22Q-30 70 39 102M52 11L8 110M-88 77Q-26 54 37 111"
          stroke="#a0a385"
          opacity=".3"
          strokeWidth="6"
          fill="none"
        />
        <path d="M-74 76Q-26 86-7 69Q9 79 3 94L-18 101H-58Z" fill="#758779" />
        <path d="M-126 124H126L151 150H-151Z" fill="#52685b" stroke="#8b9678" strokeWidth="3" />
        <path d="M-151 150H151V167H-151Z" fill="#324c44" />
        <path d="M4-139V127H126Q105 3 44-27L44-108Z" fill="#10272a" opacity=".55" />
      </g>
      <g>
        <rect x="60" y="109" width="34" height="329" fill={`url(#${id}-wood)`} />
        <rect x="907" y="109" width="34" height="329" fill={`url(#${id}-wood)`} />
        <path
          d="M101 144H135V335H101ZM865 144H899V335H865Z"
          fill="#5a5c3b"
          stroke="#8c8758"
          strokeWidth="2"
        />
        <text
          x="119"
          y="165"
          writingMode="vertical-rl"
          fontSize="17"
          letterSpacing="10"
          fill="#c7b577"
          fontFamily="serif"
        >
          一念归心声有来处
        </text>
        <text
          x="883"
          y="165"
          writingMode="vertical-rl"
          fontSize="17"
          letterSpacing="10"
          fill="#c7b577"
          fontFamily="serif"
        >
          千灯照影路在眼前
        </text>
      </g>
      <Lantern id={id} x={228} y={187} size={0.7} lit={!stone} />
      <Lantern id={id} x={838} y={211} size={0.47} lit={!stone} />
      <ellipse cx="433" cy="484" rx="234" ry="25" fill="#0e2429" opacity=".6" />
      <path d="M296 367L523 355 609 433 267 455Z" fill="#8a7951" stroke="#5c5b3f" strokeWidth="4" />
      <path d="M267 455L609 433V450L267 475Z" fill="#56523b" />
      <path d="M288 474V547M585 453V520M315 386V476" stroke="#394638" strokeWidth="13" />
      <path
        d="M302 418L567 403M315 397L546 386M292 439L584 420"
        stroke="#bdab76"
        opacity=".17"
        strokeWidth="2"
      />
      <path d="M411 405q-27-29-43 0q15 18 43 0Z" fill="#9b634a" stroke="#c19c6b" strokeWidth="2" />
      <path d="M433 414q30-31 44-2q-16 20-44 2Z" fill="#b48257" stroke="#d3b383" strokeWidth="2" />
      {(stone || rescue) && (
        <g fill="#edcea0" fontSize="13" textAnchor="middle" fontFamily="serif">
          <text x="391" y="405">
            {state.flags.cup_roll_dark ? '凸' : '平'}
          </text>
          <text x="454" y="414">
            {rescue || state.flags.cup_roll_dark ? '凸' : '平'}
          </text>
        </g>
      )}
      <path
        d="M389 399l55 7"
        stroke="#d9c08d"
        strokeWidth="7"
        opacity={state.shotKey === 'oracle_cast' || stone || rescue ? '0' : '.8'}
      />
      <ellipse cx="214" cy="465" rx="33" ry="10" fill="#6a7c61" stroke="#a0ae8b" strokeWidth="2" />
      <g transform="translate(794 351)">
        <path
          d="M0-72v-18m-42 98V-47Q0-85 42-47V8Z"
          stroke="#9c9f77"
          fill="#142c30"
          strokeWidth="3"
        />
        <path
          d="M-30-51V8M-15-63V8M0-70V8M15-63V8M30-51V8M-41-31H41M-41-4H41"
          stroke="#8c9571"
          strokeWidth="2"
        />
        <path d="M-11-18q6-15 14-5l12 9-11 3-3 7h-10Z" fill="#a8ad87" />
      </g>
      {rescue && (
        <g>
          <path d="M561 316L584 323 584 340 562 333Z" fill="#73775f" />
          <path d="M580 322Q592 319 598 328L596 339 582 338Z" fill="#c5aa89" />
        </g>
      )}
      <g data-guide-candle="true" transform={rescue ? 'translate(592 347)' : 'translate(537 357)'}>
        <ellipse cy="0" rx="21" ry="8" fill="#b5a46a" />
        <rect x="-10" y="-43" width="20" height="44" rx="3" fill="#a44c3e" />
        <path d="M-7-36h10m-7 9 9-3" stroke="#c97650" opacity=".5" />
        {rescue && (
          <>
            <ellipse cy="-47" rx="90" ry="112" fill={`url(#${id}-warm)`} />
            <path data-flame="true" d="M0-66Q-16-45 0-42Q16-46 0-66" fill="#ffe6a2" />
          </>
        )}
      </g>
      {stone && (
        <g>
          <rect width="1000" height="600" fill="#16313b" opacity=".3" />
          <path
            d="M458 301l-7 14 12 11-4 18m26-3 9 12-6 11"
            stroke="#a3b0a1"
            strokeWidth="2"
            opacity=".45"
            fill="none"
          />
          <ellipse
            data-fog="true"
            cx="495"
            cy="459"
            rx="350"
            ry="25"
            fill="#a3afa1"
            opacity=".13"
          />
        </g>
      )}
      {rescue && (
        <path d="M592 382Q541 451 520 600H725Q675 477 592 382Z" fill="#d0b477" opacity=".1" />
      )}
    </g>
  );
}
