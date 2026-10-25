import type { GameState } from '@/shared/types/game';
import { PerspectiveFloor } from '@/scene/story_art/common';

export function BedroomArt({ id, state }: { id: string; state: GameState }) {
  const lit = Boolean(state.flags.red_candle_lit);
  const waking = state.sceneKey === 'mini_wake_three_gongs';
  const dawn = state.shotKey === 'dawn_courtyard';
  const death = state.sceneKey === 'mini_death';
  const open =
    death ||
    [
      'double_exit',
      'double_frenzy',
      'death_mini_four_knocks',
      'death_mini_three_knocks',
      'death_mini_dawn_trap',
    ].includes(state.shotKey || '');
  const restless = state.shotKey === 'double_frenzy';
  return (
    <g>
      <rect width="1000" height="600" fill={dawn ? '#9f9e7e' : '#31484b'} />
      <path d="M0 0H1000V106L0 142Z" fill="#1f3237" />
      <path
        d="M0 99L1000 49M68 0L323 123M536 0L668 104M900 0L944 87"
        stroke="#19282d"
        strokeWidth="28"
      />
      <path d="M0 136L563 117 1000 131" stroke="#54605a" strokeOpacity=".4" strokeWidth="4" />
      <path d="M0 141L53 143V365L0 396Z" fill="#243c40" />
      <rect x="54" y="132" width="946" height="269" fill={dawn ? '#a9a88b' : '#465a57'} />
      <path d="M56 348H1000M56 355H1000" stroke="#253d3e" strokeWidth="5" />
      <path
        d="M105 158L121 187 117 229M533 146L510 169 519 203M754 311l16-26 12 3"
        stroke="#9eaa8b"
        strokeWidth="1.6"
        opacity=".22"
        fill="none"
      />
      <PerspectiveFloor id={id} horizon={401} night={!dawn} />
      <g>
        <path
          d="M65 297H302L355 441 77 465Z"
          fill={`url(#${id}-wood)`}
          stroke="#6e7761"
          strokeWidth="5"
        />
        <path d="M75 312H291L335 422 88 443Z" fill="#959e88" />
        <path d="M82 339L294 336 325 414 90 436Z" fill="#718a84" />
        <path
          d="M98 347L287 345M103 366L295 363M111 390L306 385"
          stroke="#c1c1a1"
          opacity=".16"
          strokeWidth="4"
        />
        <path d="M94 319H199L207 342 101 346Z" fill="#bfc2a4" stroke="#7e927f" strokeWidth="2" />
        <path
          d="M72 296V450M301 295V441M85 449V495M343 431V481"
          stroke="#3a4a3e"
          strokeWidth="11"
        />
        <path d="M65 283H305V303H65Z" fill="#50664f" stroke="#809274" strokeWidth="3" />
        <path d="M74 287H298M102 291H263" stroke="#a5a58b" opacity=".25" />
      </g>
      <g>
        <rect x="557" y="140" width="185" height="280" fill="#1a2d31" />
        <rect x="570" y="151" width="159" height="256" fill={`url(#${id}-planks)`} />
        {open ? (
          <g>
            <path
              d="M574 151L663 174V409L574 407Z"
              fill="#394b46"
              stroke="#8b9278"
              strokeWidth="3"
            />
            <path d="M666 164H729V407H666Z" fill="#101e25" />
            <path d="M674 401L729 384V410Z" fill="#abbdac" opacity=".15" />
          </g>
        ) : (
          <g>
            <path d="M649 153V405" stroke="#192a2d" strokeWidth="5" />
            <path d="M596 305H704" stroke="#a28e60" strokeWidth="9" />
            <path d="M605 299V317M692 299V317" stroke="#344437" strokeWidth="6" />
            <circle cx="649" cy="214" r="4" fill="#14282d" stroke="#9a9a7a" />
          </g>
        )}
        <path
          d="M560 142H740M564 144V419M734 144V419"
          stroke={`url(#${id}-wood)`}
          strokeWidth="11"
        />
        <rect x="628" y="123" width="43" height="27" rx="2" fill="#5b614a" stroke="#a99a6d" />
        <text x="649" y="143" textAnchor="middle" fontSize="20" fill="#d3c18e" fontFamily="serif">
          门
        </text>
        <path d="M568 412H731" stroke="#9d5443" strokeWidth="4" opacity=".6" />
        <path d="M569 419H732" stroke="#a8b4a0" strokeWidth="3" opacity=".35" />
      </g>
      <g>
        <rect x="769" y="123" width="198" height="205" fill="#253d40" />
        <rect x="783" y="137" width="171" height="178" fill={dawn ? '#a8beb3' : '#142a39'} />
        {dawn ? (
          <path d="M785 237L827 213 869 234 903 200 954 235V315H783Z" fill="#71927d" />
        ) : (
          <>
            <circle
              cx="874"
              cy={waking ? 174 : 185}
              r="19"
              fill="#c9d8ce"
              opacity={state.sceneKey === 'mini_dawn_trap' ? '.13' : '.68'}
            />
            <path d="M780 235L820 217 867 238 903 211 958 243V315H780Z" fill="#203c40" />
            <path
              d="M791 204Q865 180 950 214V230Q865 211 791 233Z"
              fill="#112936"
              opacity={state.sceneKey === 'mini_dawn_trap' ? '.9' : '.3'}
            />
          </>
        )}
        <path d="M782 246H954M839 136V314M897 136V314" stroke="#3e5145" strokeWidth="8" />
        <path
          d="M782 243H954M836 139V314M894 139V314"
          stroke="#a9ab8e"
          strokeOpacity=".18"
          strokeWidth="2"
        />
        <path d="M772 316H970" stroke="#62705a" strokeWidth="10" />
      </g>
      <path
        d="M786 316L525 600H793L952 316Z"
        fill={dawn ? '#fce2a1' : '#b2d2d4'}
        opacity={dawn ? '.15' : '.08'}
      />
      <path
        d="M840 315L659 600M898 316L739 600M760 387L922 387M707 458L883 458"
        stroke="#293e3e"
        strokeWidth="8"
        opacity=".23"
      />
      <g>
        <ellipse cx="355" cy="495" rx="148" ry="22" fill="#111f24" opacity=".35" />
        <path
          d="M251 418L401 398 470 445 293 473Z"
          fill="#8d7952"
          stroke="#514d37"
          strokeWidth="3"
        />
        <path d="M293 473L470 445V458L293 487Z" fill="#594f37" />
        <path d="M306 483V527M449 457V509M265 441V493" stroke="#414536" strokeWidth="10" />
        <path
          d="M278 432L421 418M289 447L441 432M305 460L455 447"
          stroke="#bdab78"
          strokeOpacity=".18"
          strokeWidth="2"
        />
      </g>
      <g opacity=".55">
        <path d="M480 379V436" stroke="#6c7056" strokeWidth="5" />
        <ellipse cx="480" cy="437" rx="24" ry="8" fill="#58654e" />
        <path d="M469 379h22l-5-25h-12Z" fill="#a1a079" stroke="#64735a" />
        <path d="M480 355v-10" stroke="#151f24" strokeWidth="2" />
      </g>
      {lit && (
        <g>
          <ellipse
            cx="352"
            cy="398"
            rx="345"
            ry="280"
            fill={`url(#${id}-warm)`}
            opacity={restless ? '.7' : '1'}
          />
          <path d="M358 450L219 600H580Z" fill="#b9a064" opacity=".07" />
        </g>
      )}
      {waking && (
        <g>
          <path
            d="M351 415q-17-24 3-37t-3-30"
            stroke="#c4d0be"
            opacity=".24"
            fill="none"
            strokeWidth="3"
          />
          <ellipse cx="685" cy="425" rx="64" ry="14" fill="#0c2027" opacity=".6" />
        </g>
      )}
      {restless && (
        <g opacity=".17">
          <path d="M614 400L558 559 688 522 695 407Z" fill="#142025" />
          <path d="M651 301l-5 8 4 10M660 344l-4 11" stroke="#c7c0a0" />
        </g>
      )}
      {death && <rect width="1000" height="600" fill="#0c1119" opacity=".68" />}
    </g>
  );
}
