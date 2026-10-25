export function DoorDetail({ wet, peephole }: { wet: boolean; peephole: boolean }) {
  return (
    <svg
      viewBox="0 0 320 210"
      role="img"
      aria-label={
        peephole
          ? '门眼外是无人回廊，门缝红蜡完整'
          : wet
            ? '门闩上的水痕，门缝红蜡仍然完整'
            : '旧木门闩卡进深槽，门缝红蜡完整'
      }
    >
      <path d="M0 0H320V210H0Z" fill="#344036" />
      {[12, 69, 127, 191, 253, 314].map((x) => (
        <path key={x} d={`M${x} 0v210`} stroke="#1d2c29" strokeWidth="3" />
      ))}
      <path d="M160 0V210" stroke="#111c1b" strokeWidth="7" />
      <path d="M36 115H282V145H36Z" fill="#86714c" stroke="#ba9a64" strokeWidth="2" />
      <path d="M45 120L262 125M57 136L269 132" stroke="#4e4b35" strokeWidth="3" />
      <path d="M57 104v54M265 103v55" stroke="#242e27" strokeWidth="10" />
      <path d="M266 108h17v44h-17" fill="none" stroke="#aba07b" strokeWidth="5" />
      <path d="M142 190q7-9 15-3t15-3l11 10-8 7h-30Z" fill="#9d4535" stroke="#bf7354" />
      <path d="M149 191h27" stroke="#d59469" strokeWidth="2" />
      {wet && (
        <g fill="#a0c1be" opacity=".7">
          <path d="M94 65q-12 22 0 24t0-24M227 87q-7 15 0 16t0-16M129 151q-7 18 0 19t0-19" />
        </g>
      )}
      {peephole && (
        <g>
          <circle cx="160" cy="54" r="35" fill="#070f13" stroke="#927a50" strokeWidth="5" />
          <path d="M135 55h50M148 25l-4 59m30-59 4 59" stroke="#384d4f" strokeWidth="3" />
          <path d="M136 79l24-18 24 18" fill="#93aaaa" opacity=".45" />
        </g>
      )}
    </svg>
  );
}

export function ShadowDetail({ seam }: { seam: boolean }) {
  return (
    <svg
      viewBox="0 0 320 210"
      role="img"
      aria-label={
        seam ? '同行人的衣领拉开，露出细密缝线' : '烛光照到同行人的鞋尖，影子边缘突然断开'
      }
    >
      <path d="M0 0H320V210H0Z" fill="#273b3b" />
      {seam ? (
        <g>
          <path d="M80 210L105 38l53 47 51-47 31 172Z" fill="#879780" />
          <path d="M105 38l53 47 51-47-20 86-31-9-31 9Z" fill="#b99c7c" />
          <path d="M157 84v87" stroke="#664d40" strokeWidth="4" />
          <path
            d="M147 95l21 5m-21 10 21 5m-21 10 21 5m-21 10 21 5m-21 10 21 5"
            stroke="#e0c6a3"
            strokeWidth="2"
          />
        </g>
      ) : (
        <g>
          <path d="M0 83L320 14V177L0 210Z" fill="#c29d59" opacity=".3" />
          <path d="M203 27l-6 85h30l18-88M249 22l-8 83h29l25-92" fill="#4b574e" />
          <path d="M194 103q-24 16 30 18l12-13M240 101q-20 17 26 15l11-12" fill="#202e2d" />
          <path d="M208 122L166 168H205L232 122ZM249 118L234 162h30l4-44" fill="#102326" />
          <path d="M152 174l138-16" stroke="#d2b572" strokeWidth="2" strokeDasharray="2 5" />
        </g>
      )}
    </svg>
  );
}
