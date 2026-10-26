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
    <svg viewBox="0 0 320 210" role="img" aria-label="四只木碗签中周砚的刻痕最深">
      <path d="M0 0H320V210H0Z" fill="#6c6346" />
      {['林岚', '周砚', '许栀', '赵熙'].map((name, index) => (
        <g key={name} transform={`translate(${54 + index * 59} 30)`}>
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
