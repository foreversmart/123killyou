export function DragMarkDetail({ drawing }: { drawing: boolean }) {
  return (
    <svg
      viewBox="0 0 320 210"
      role="img"
      aria-label={
        drawing ? '折叠修缮图，偏殿的位置被折痕遮住一角' : '地砖上两道旧拖痕从偏殿方向延伸过来'
      }
    >
      {drawing ? (
        <g>
          <path d="M30 20l248 9-7 165-245-7Z" fill="#c3b88d" stroke="#877e5c" strokeWidth="2" />
          <path
            d="M49 47H250V163H49ZM127 47V163M49 111H250M181 47V111"
            fill="none"
            stroke="#5e6e58"
            strokeWidth="3"
          />
          <path d="M47 117h82m0-22v40m51-57v28m41 9v47" stroke="#beb386" strokeWidth="8" />
          <path d="M152 25l-8 165M29 102l246 7" stroke="#8d8b67" strokeWidth="4" opacity=".6" />
          <path d="M181 46l70 1v64l-51-6Z" fill="#b3a77a" />
          <text x="192" y="80" fontSize="17" fill="#4e5b46" fontFamily="serif">
            偏殿
          </text>
          <path
            d="M211 33l-18 68 52 18"
            stroke="#8d8865"
            strokeWidth="9"
            opacity=".7"
            fill="none"
          />
        </g>
      ) : (
        <g>
          <path d="M0 0H320V210H0Z" fill="#55645a" />
          <path
            d="M0 53H320M0 113H320M0 178H320M61 0v53m130 0v60m-130 0v65m130 0v32"
            stroke="#253e38"
            strokeWidth="4"
          />
          <path d="M50 210L250 0M66 210L266 0" stroke="#1d3430" strokeWidth="7" opacity=".75" />
          <path d="M40 197L242 0M78 210L279 0" stroke="#a2a386" strokeWidth="2" opacity=".4" />
        </g>
      )}
    </svg>
  );
}

export function BowlTagDetail() {
  return (
    <svg
      viewBox="0 0 320 210"
      role="img"
      aria-label="施食记残页上写着远客，四只木碗签中周砚的刻痕最深"
    >
      <path d="M0 0H320V210H0Z" fill="#6c6346" />
      <path d="M18 19l115 7-3 91-16-7-15 10-20-9-21 12-20-12-24 9Z" fill="#cabb92" />
      <text x="44" y="61" fontSize="21" fill="#4b5039" fontFamily="serif">
        施食记
      </text>
      <text x="48" y="94" fontSize="24" fill="#424b35" fontFamily="serif">
        远客
      </text>
      {['林岚', '周砚', '许栀', '赵熙'].map((name, index) => (
        <g key={name} transform={`translate(${153 + index * 39} 30)`}>
          <path d="M0 0h28v151H0Z" fill="#b39a67" stroke="#574d32" strokeWidth="2" />
          <text
            x="14"
            y="30"
            textAnchor="middle"
            writingMode="vertical-rl"
            fontSize="17"
            fill="#42452e"
            fontFamily="serif"
          >
            {name}
          </text>
          <path d="M6 105l16-11" stroke="#493b28" strokeWidth={index === 1 ? 6 : 2} />
        </g>
      ))}
    </svg>
  );
}
