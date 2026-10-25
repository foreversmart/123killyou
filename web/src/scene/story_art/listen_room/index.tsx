import type { GameState } from '@/shared/types/game';
import { Lantern, LatticeWindow, PerspectiveFloor } from '@/scene/story_art/common';

export function ListenRoomArt({ id, state }: { id: string; state: GameState }) {
  const broken =
    state.shotKey === 'listen_vase' || state.flags.vase_broken || state.sceneKey === 'mini_death';
  return (
    <g>
      <rect width="1000" height="600" fill={`url(#${id}-night)`} />
      <rect x="423" y="107" width="547" height="316" fill="#3a504b" />
      <PerspectiveFloor id={id} horizon={423} night />
      <LatticeWindow id={id} x={802} y={149} width={134} height={147} night />
      <path d="M814 296L533 600H775L936 296Z" fill="#b4cbcb" opacity=".08" />
      <path d="M0 89L1000 102V122L0 114Z" fill="#182b2c" />
      <path d="M0 144H1000" stroke="#556052" strokeWidth="7" opacity=".6" />
      <g>
        <path
          d="M644 327L869 317 935 418 674 434Z"
          fill="#4e5140"
          stroke="#7d8368"
          strokeWidth="5"
        />
        <path d="M657 338L857 330 909 405 687 420Z" fill="#828c78" />
        <path d="M682 347Q754 327 827 349L886 393 699 406Z" fill="#626b61" />
        <path d="M678 429V480M920 416V463M654 332V419" stroke="#2b3c33" strokeWidth="13" />
        <path
          d="M817 340Q846 345 865 366L871 377 853 379 830 367 812 368Z"
          fill="#b7b49b"
          opacity=".56"
        />
        <path
          d="M863 379l7 13m-12-14 5 15m-11-13 2 13"
          stroke="#b7b49b"
          strokeWidth="3"
          opacity=".56"
        />
      </g>
      <Lantern id={id} x={580} y={184} size={0.65} lit={!broken} />
      <path d="M48 0V600H0V0ZM403 0H438V600H403Z" fill="#13272b" />
      <path d="M58 0H397V429L58 528Z" fill="#344843" />
      <path d="M83 153H361V401L83 478Z" fill={`url(#${id}-planks)`} />
      <path d="M102 171H343V401L102 459Z" stroke="#66725c" strokeWidth="5" fill="none" />
      <path
        d="M130 183V444M178 180V431M226 179V419M274 177V407M322 173V395"
        stroke="#213a37"
        strokeWidth="4"
      />
      <path d="M95 274L348 259M95 367L348 323" stroke="#203a35" strokeWidth="7" />
      <path d="M350 296l18-4v32l-18 5Z" fill="#a59762" opacity=".65" />
      <path d="M432 135L524 166V432L432 466Z" fill="#4d5a48" stroke="#777c5f" strokeWidth="4" />
      <path d="M446 167L505 184V411L446 434Z" fill={`url(#${id}-planks)`} />
      <path d="M980 0H1000V600H964V147" fill="#14252c" />
      <path d="M426 113H983" stroke={`url(#${id}-wood)`} strokeWidth="20" />
      <rect x="644" y="112" width="43" height="34" fill="#50553d" stroke="#a79a65" />
      <text x="666" y="138" textAnchor="middle" fontSize="23" fill="#d0bf8c" fontFamily="serif">
        灯
      </text>
      <path d="M466 0L479 103M459 71L486 77" stroke="#8c9682" opacity=".14" />
      {broken ? (
        <g stroke="#6e8e87" strokeWidth="2">
          <path d="M202 480l31-8 10 22-35 4Z" fill="#c0c0a3" />
          <path d="M255 497l15-29 22 16-14 23Z" fill="#9fae9d" />
          <path d="M221 510l20 4 10-9 3 19-27 6Z" fill="#bdc3a8" />
          <path d="M277 521l20-12 12 16-20 5Z" fill="#768f84" />
          <path d="M198 533l11-3m84 11 13 3m-46-24 4 10" />
        </g>
      ) : (
        <g>
          <ellipse cx="235" cy="508" rx="38" ry="11" fill="#13262b" opacity=".65" />
          <path
            d="M224 407H247L241 432Q277 471 257 498H212Q194 470 229 432Z"
            fill="#92aaa0"
            stroke="#597c75"
            strokeWidth="3"
          />
          <path
            d="M218 459Q235 442 254 460M211 476Q233 491 262 474"
            stroke="#3e6568"
            strokeWidth="4"
            fill="none"
          />
          <path d="M218 409H253" stroke="#c1c9b0" strokeWidth="5" />
        </g>
      )}
      <ellipse cx="350" cy="513" rx="28" ry="8" fill="#79907d" stroke="#acb79a" strokeWidth="2" />
      <g transform="translate(320 242)" opacity=".65">
        <path d="M0 0v-24m-29 77V7Q0-22 29 7v46Z" stroke="#b1aa7c" strokeWidth="3" fill="#1b3030" />
        <path
          d="M-21 4v47M-11-2v53M0-7v58M11-2v53M21 4v47M-30 22H30M-30 46H30"
          stroke="#8e9876"
          strokeWidth="2"
        />
        <path d="M-7 31q4-12 10-6l9 6-7 2-2 6h-8Z" fill="#a3ae8c" />
      </g>
      {broken && <rect width="1000" height="600" fill="#0b1a24" opacity=".24" />}
      <path d="M0 553Q407 521 1000 550V600H0Z" fill="#102329" opacity=".3" />
    </g>
  );
}
