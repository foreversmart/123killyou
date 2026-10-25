export function DeathFigure({ pose }: { pose?: string }) {
  const fourKnocks = pose === 'death_mini_four_knocks';
  return (
    <svg
      viewBox="0 0 160 240"
      role="img"
      aria-label={
        fourKnocks
          ? '门槛上的同行人背向月光，后背缺去一整片皮，一只手正伸进门内。面孔无法辨清。'
          : '高大的黑影堵住门槛，轮廓像被门缝拉长，裂开的长指探向门内。'
      }
      data-death-figure={fourKnocks ? 'skinned_companion' : 'door_shadow'}
    >
      <ellipse cx="81" cy="230" rx="73" ry="9" fill="#070d13" opacity=".72" />
      {fourKnocks ? <SkinnedFigure /> : <DoorShadow />}
    </svg>
  );
}

function DoorShadow() {
  return (
    <g>
      <path
        d="M56 12Q84-8 109 16L133 59 154 190 137 233H19L4 186 29 56Z"
        fill="#09151d"
        opacity=".35"
      />
      <path
        d="M53 43Q38 9 73 4Q113-3 107 43L119 59 130 93 144 165 127 153 120 125 122 196 140 231H22L38 192 35 122 22 160 8 166 28 79 43 56Z"
        fill="#080e16"
      />
      <path d="M60 7Q84 0 99 16L105 49 93 59 72 55 56 39Z" fill="#14212a" />
      <path d="M68 32l10 2m12-1 7-2" stroke="#96a69e" strokeWidth="1.8" opacity=".6" />
      <path
        d="M52 62L77 91 67 170 52 216M103 65L90 107 105 195"
        stroke="#344049"
        strokeWidth="2"
        opacity=".35"
        fill="none"
      />
      <path
        d="M36 107L18 143 4 160 1 178 7 182 12 168 18 163 10 185 14 189 24 169 27 168 22 191 28 190 35 165 39 161 37 181 44 177 48 152 53 139Z"
        fill="#111c25"
        stroke="#6d7d7b"
        strokeWidth="1.5"
      />
      <path
        d="M117 105L133 133 147 153 157 164 158 180 152 183 148 170 143 167 150 187 145 190 135 170 129 161 130 181 122 177 119 153 109 131Z"
        fill="#101b24"
      />
      <path
        d="M20 159L29 164 28 177M35 151l4 10m-9-24-7 14"
        fill="none"
        stroke="#84918a"
        strokeWidth="1.4"
        opacity=".5"
      />
      <path
        d="M32 217L14 234M51 220L46 238M109 214L119 238M130 216L146 236"
        stroke="#080e16"
        strokeWidth="5"
      />
    </g>
  );
}

function SkinnedFigure() {
  return (
    <g>
      <path d="M55 167H111L119 228H93L81 187 71 228H42Z" fill="#293538" />
      <path d="M49 225L39 233H73V225M94 225V233H128L116 225" fill="#14232a" />
      <path
        d="M62 47L55 65 39 79 32 129 45 135 57 105 52 178H114L108 108 124 141 137 132 123 77 104 65 97 46Z"
        fill="#8c9285"
        stroke="#39484a"
        strokeWidth="2"
      />
      <path
        d="M61 64Q80 56 101 70L99 106 106 140 90 164 64 151 57 119Z"
        fill="#14232a"
        stroke="#b1ad91"
        strokeWidth="2"
      />
      <path
        d="M64 71L76 83 70 96 85 106 76 121 87 137 81 154"
        fill="none"
        stroke="#526365"
        strokeWidth="1.5"
        opacity=".7"
      />
      <path
        d="M59 86l6 1m-7 12 6 1m-6 12 6 2m-5 12 6 2m33-45-5 2m6 12-6 2m8 13-6 2"
        stroke="#b4ad8c"
        strokeWidth="1.5"
      />
      <path d="M59 42Q47 14 72 8Q104 4 109 31L104 52 91 65 69 60Z" fill="#8e998e" />
      <path d="M56 37Q43 9 76 4Q111 4 113 31L99 25 90 40 69 43 61 54Z" fill="#202d31" />
      <path d="M105 38l8 7-9 4-2 8" fill="#a7ae9b" />
      <path
        d="M39 115L22 138 9 150 2 165 6 172 14 158 21 153 12 177 17 181 28 158 32 158 26 182 33 179 39 158 46 149 56 136Z"
        fill="#9ca391"
        stroke="#4c605e"
        strokeWidth="1.5"
      />
      <path d="M17 149l7 9m6-13 5 11" stroke="#526663" fill="none" strokeWidth="1.5" />
      <path d="M117 126l12 20 13 6-4 12-19-10-12-17Z" fill="#8e998c" />
      <path d="M58 165L72 171M96 168L109 164" stroke="#b7b69d" opacity=".6" />
    </g>
  );
}
