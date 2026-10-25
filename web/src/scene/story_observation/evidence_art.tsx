import { storyAssets } from '@/shared/lib/story_assets';

export function DragMarkDetail({ drawing }: { drawing: boolean }) {
  return (
    <img
      src={drawing ? storyAssets.props.repairDrawing : storyAssets.details.dragMarks}
      alt={drawing ? '折叠修缮图' : '灯房门边石砖上的两道旧拖痕'}
    />
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
