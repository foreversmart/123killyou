import type { GameState } from '@/shared/types/game';
import { Lantern, PerspectiveFloor } from '@/scene/story_art/common';

function RoomDoor({
  id,
  x,
  name,
  night,
  open = false,
}: {
  id: string;
  x: number;
  name: string;
  night: boolean;
  open?: boolean;
}) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="-7" y="160" width="164" height="254" fill={`url(#${id}-wood)`} />
      <rect y="172" width="150" height="234" fill={night ? '#18272a' : '#5e6652'} />
      <rect
        x="9"
        y="184"
        width="132"
        height="212"
        fill={`url(#${id}-planks)`}
        opacity={night ? '.7' : '1'}
      />
      {open && (
        <path d="M17 179L104 196V400L17 396Z" fill="#384a43" stroke="#92876a" strokeWidth="3" />
      )}
      {!open && <path d="M75 181V399M14 294H138" stroke="#161f20" strokeWidth="4" />}
      <rect
        x="56"
        y="136"
        width="40"
        height="32"
        rx="2"
        fill="#494c38"
        stroke="#a99868"
        strokeWidth="2"
      />
      <text x="76" y="159" textAnchor="middle" fontSize="21" fill="#d5c796" fontFamily="serif">
        {name}
      </text>
      <path d="M60 313v15M91 313v15" stroke="#ad9960" strokeWidth="3" />
      <rect x="-19" y="404" width="188" height="9" fill={night ? '#55675e' : '#aaa184'} />
      <path d="M19 236l14 24-7 32M129 345l-8 17" fill="none" stroke="#a4a28b" opacity=".12" />
    </g>
  );
}

export function CourtyardArt({ id, state }: { id: string; state: GameState }) {
  const register = state.sceneKey === 'mini_register';
  const dawn = state.sceneKey === 'mini_dawn';
  const night = !register && !dawn;
  return (
    <g>
      <rect width="1000" height="600" fill={night ? `url(#${id}-night)` : `url(#${id}-sky)`} />
      {night ? (
        <circle cx="790" cy="83" r="25" fill="#c1d4cd" opacity=".7" />
      ) : (
        <ellipse cx="815" cy="180" rx="280" ry="250" fill={`url(#${id}-warm)`} />
      )}
      <path
        d="M0 105L123 53 272 117 391 64 590 121 784 42 1000 107V214H0Z"
        fill={night ? '#1c3439' : '#79947f'}
        opacity=".6"
      />
      <rect x="0" y="143" width="1000" height="270" fill={night ? '#42554f' : '#c0b697'} />
      <path d="M0 138H1000V173H0Z" fill={night ? '#273b39' : '#65725a'} />
      <path d="M0 141L100 110H910L1000 141Z" fill={`url(#${id}-tiles)`} />
      <path d="M0 153H1000M0 166H1000" stroke="#152b2a" strokeWidth="6" />
      <PerspectiveFloor id={id} horizon={414} night={night} />
      {[70, 300, 550, 790].map((x, i) => (
        <RoomDoor
          key={x}
          id={id}
          x={x}
          name={['听', '灯', '纸', '门'][i]}
          night={night}
          open={dawn || (register && state.shotKey === 'register_rooms' && i === 3)}
        />
      ))}
      {[15, 250, 500, 750, 980].map((x) => (
        <g key={x}>
          <rect x={x} y="145" width="17" height="283" fill={`url(#${id}-wood)`} />
          <rect x={x - 6} y="416" width="29" height="15" fill="#74775f" />
        </g>
      ))}
      {[258, 509, 755].map((x) => (
        <Lantern key={x} id={id} x={x} y={181} size={0.52} lit={night || register} />
      ))}
      <path d="M0 423H1000" stroke={night ? '#a3aa87' : '#e0cfa5'} strokeWidth="5" opacity=".5" />
      {register && (
        <g>
          <ellipse cx="440" cy="513" rx="194" ry="18" fill="#3b473b" opacity=".25" />
          <path
            d="M302 422L545 402 606 433 350 460Z"
            fill="#a9895a"
            stroke="#685c3f"
            strokeWidth="3"
          />
          <path d="M350 460L606 433V449L350 478Z" fill="#64573e" />
          <path d="M365 472V532M578 452V508M329 453V505" stroke="#514d37" strokeWidth="13" />
          <path d="M366 490L575 470" stroke="#7d6c47" strokeWidth="6" />
          <path d="M386 431L441 424 465 436 407 444Z" fill="#e0cda1" opacity=".7" />
          <path d="M403 430L445 433M410 437L451 437" stroke="#8d825c" strokeWidth="1" />
          <path d="M538 403v-52" stroke="#66573e" strokeWidth="5" />
          <path d="M503 350H564" stroke="#65573e" strokeWidth="5" />
          {[506, 522, 538, 554].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 351v10`} stroke="#c7ac68" />
              <rect x={x - 5} y="362" width="12" height="24" rx="2" fill="#a88f53" />
              <text x={x + 1} y="379" textAnchor="middle" fontSize="10" fill="#393e30">
                {['听', '灯', '纸', '门'][i]}
              </text>
            </g>
          ))}
        </g>
      )}
      {night && (
        <g>
          <path d="M685 405L855 600H923L724 405Z" fill="#b8bc86" opacity=".08" />
          <path d="M60 552L442 420M78 561L451 424" stroke="#101f25" strokeWidth="5" opacity=".4" />
          <rect x="936" y="270" width="32" height="110" fill="#2d3a32" stroke="#a39560" />
          <text
            x="952"
            y="287"
            writingMode="vertical-rl"
            fontSize="13"
            letterSpacing="5"
            fill="#bbac79"
          >
            钟楼封闭
          </text>
        </g>
      )}
      {dawn && (
        <g>
          <path d="M1000 85L640 414 1000 559Z" fill="#fff0b3" opacity=".16" />
          <path d="M1000 147L801 414 1000 471Z" fill="#fff6cb" opacity=".2" />
          <path
            d="M830 68q10-14 20 0q10-14 20 0M708 97q7-10 14 0q7-10 14 0"
            fill="none"
            stroke="#607970"
            strokeWidth="2"
          />
          <ellipse
            data-fog="true"
            cx="370"
            cy="402"
            rx="600"
            ry="21"
            fill="#e8e2c9"
            opacity=".26"
          />
        </g>
      )}
      <path d="M0 580Q450 556 1000 575V600H0Z" fill={night ? '#13272b' : '#a8aa88'} opacity=".28" />
    </g>
  );
}
