import { LightArt } from './light_art';
import type { PropKind } from '@/scene/story_stage/types';

export function PropArt({
  kind,
  name,
  lit,
  broken,
}: {
  kind: PropKind;
  name: string;
  lit?: boolean;
  broken?: boolean;
}) {
  return (
    <svg viewBox="0 0 120 100" aria-hidden="true">
      <ellipse cx="60" cy="88" rx="42" ry="7" fill="#0004" />
      {(kind === 'candle' || kind === 'lamp') && <LightArt kind={kind} lit={lit} />}
      {kind === 'book' && (
        <>
          <path
            d="M16 18l78-8 13 68-79 12Z"
            fill={name.includes('经') ? '#57767d' : '#8e7150'}
            stroke="#bcaa83"
            strokeWidth="2"
          />
          <path d="M21 26l8 58 74-11" fill="none" stroke="#d7c8a5" strokeWidth="5" />
          <path d="M27 18l8 58" stroke="#c4bca0" strokeWidth="2" strokeDasharray="3 4" />
          <rect x="46" y="24" width="35" height="40" fill="#dfd1aa" transform="rotate(-7 62 44)" />
          <text x="64" y="48" fontSize="11" textAnchor="middle" fill="#4d554a">
            {name.includes('经') ? '清心经' : name.includes('史') ? '寺史' : '登记簿'}
          </text>
        </>
      )}
      {kind === 'paper' && (
        <>
          <path d="M25 12l69 8-8 67-21-4-6 7-15-7-25-3Z" fill="#d5c6a2" stroke="#9a8764" />
          <path d="M37 30l43 5m-46 8 39 5m-39 9 46 6m-48 7 28 4" stroke="#7b735a" strokeWidth="2" />
          <rect x="65" y="61" width="13" height="15" fill="none" stroke="#8c4e3e" strokeWidth="2" />
        </>
      )}
      {kind === 'key' && (
        <g transform="rotate(24 60 50)" fill="none" stroke="#c2a269" strokeWidth="8">
          <circle cx="43" cy="30" r="18" />
          <path d="M43 49v39h28m-14-11h14" />
        </g>
      )}
      {kind === 'beads' && (
        <>
          <ellipse
            cx="60"
            cy="51"
            rx="31"
            ry="28"
            fill="none"
            stroke="#66513e"
            strokeWidth="8"
            strokeDasharray="1 12"
            strokeLinecap="round"
          />
          <path d="M59 81v13m-5-9-8 7m15-8 9 6" stroke="#a28e60" strokeWidth="3" />
          <circle cx="84" cy="31" r="6" fill="#b89f6b" />
        </>
      )}
      {kind === 'bowl' && (
        <>
          <ellipse cx="60" cy="80" rx="20" ry="6" fill="#8c8d75" />
          <path
            d="M16 41Q24 87 60 85Q97 85 104 41Z"
            fill="#bac0a5"
            stroke="#6e8273"
            strokeWidth="3"
          />
          <ellipse
            cx="60"
            cy="41"
            rx="44"
            ry="16"
            fill="#d9cda2"
            stroke="#e9dfbb"
            strokeWidth="3"
          />
          <path d="M29 41q8-9 21 1m18-7 15 5M45 48l16-4" stroke="#b68b65" strokeWidth="4" />
          <circle cx="78" cy="44" r="4" fill="#e4c272" />
          <path
            d="M39 23q-9-12 0-20m26 17q-9-9 0-18"
            stroke="#f7e5c254"
            fill="none"
            strokeWidth="2"
          />
        </>
      )}
      {kind === 'bread' && (
        <>
          <ellipse cx="60" cy="77" rx="49" ry="13" fill="#73877a" />
          <ellipse
            cx="49"
            cy="63"
            rx="30"
            ry="14"
            fill="#c4a068"
            stroke="#e6ce9b"
            strokeWidth="3"
          />
          <ellipse
            cx="76"
            cy="48"
            rx="28"
            ry="13"
            fill="#dbc18a"
            stroke="#f2deb2"
            strokeWidth="3"
          />
          <path d="M58 47h28M35 62h27" stroke="#b5905b" strokeWidth="2" strokeDasharray="2 5" />
        </>
      )}
      {kind === 'spoon' && (
        <g transform="rotate(35 60 50)">
          <ellipse
            cx="58"
            cy="28"
            rx="16"
            ry="25"
            fill="#b18e5b"
            stroke="#d6bc87"
            strokeWidth="3"
          />
          <path d="M58 49v43" stroke="#ae8a56" strokeWidth="10" strokeLinecap="round" />
        </g>
      )}
      {kind === 'vase' && (
        <>
          <path
            d="M44 10h32v14l-8 15q31 29 18 47H34Q21 68 52 39l-8-15Z"
            fill="#abbcaf"
            stroke="#d5d6b7"
            strokeWidth="2"
          />
          <path
            d="M43 57q17-17 35 0M33 73q26 13 54 0"
            stroke="#4a7271"
            fill="none"
            strokeWidth="4"
          />
          <ellipse cx="60" cy="11" rx="16" ry="4" fill="#4c615c" />
        </>
      )}
      {kind === 'shards' && (
        <g fill="#a9beb2" stroke="#e7ddbd">
          <path d="M17 74l23-17 12 24Z" />
          <path d="M59 50l28 11-22 21Z" />
          <path d="M93 73l17 7-23 8Z" />
          <path d="M37 89l10-8 9 12Z" />
        </g>
      )}
      {kind === 'cage' && (
        <>
          <path
            d="M17 88V41Q18 8 60 8Q102 8 103 41V88Z"
            fill="#263b3c44"
            stroke="#9c986c"
            strokeWidth="3"
          />
          <path
            d="M31 87V29m16 58V17m24 70V17m16 70V29M17 44h86M15 87h91"
            stroke="#c2b58b"
            strokeWidth="2"
          />
          <path d="M41 61q10-21 22-4l17 4-17 7-22-2Z" fill="#b6a77a" />
          <path d="M44 69h35" stroke="#978660" strokeWidth="3" />
        </>
      )}
      {kind === 'cups' && (
        <g transform="rotate(-15 60 50)">
          <path d="M15 40q32-42 39 9q2 24-39-9Z" fill="#945244" stroke="#c68d63" strokeWidth="3" />
          <path d="M69 49q31-36 36 8q-9 28-36-8Z" fill="#d4a679" stroke="#955545" strokeWidth="3" />
        </g>
      )}
      {kind === 'bell' && (
        <>
          <path
            d="M60 8v14M35 66q0-43 25-43q25 0 25 43l10 10H25Z"
            fill="#b49c5b"
            stroke="#d8bf7b"
            strokeWidth="3"
          />
          <ellipse cx="60" cy="77" rx="34" ry="7" fill="#605a39" />
          <path d="M60 74v13" stroke="#aa8a50" strokeWidth="6" />
        </>
      )}
      {kind === 'bag' && (
        <>
          <rect
            x="26"
            y="27"
            width="67"
            height="63"
            rx="8"
            fill="#77816b"
            stroke="#c0b695"
            strokeWidth="3"
          />
          <path
            d="M45 28V13h27v15m-37 9v44m48-44v44"
            fill="none"
            stroke="#444d41"
            strokeWidth="5"
          />
          <rect x="45" y="51" width="29" height="23" fill="#99866a" />
        </>
      )}
      {kind === 'camera' && (
        <>
          <path
            d="M17 33h22l8-11h29l8 11h20v49H17Z"
            fill="#3b504a"
            stroke="#a7ac92"
            strokeWidth="3"
          />
          <circle cx="62" cy="57" r="21" fill="#8caaa2" stroke="#253632" strokeWidth="7" />
          <circle cx="62" cy="57" r="11" fill="#405d5c" />
          <rect x="87" y="41" width="10" height="7" fill="#d2c6a4" />
        </>
      )}
      {kind === 'ribbon' && (
        <path
          d="M22 32q36-28 47 15q30-32 34 2q-11 37-41 7q0 33-31 32q-30-8 21-37q-28 1-30-19"
          fill="none"
          stroke="#7aa1bf"
          strokeWidth="10"
        />
      )}
      {kind === 'match' && (
        <>
          <path d="M20 39l71 33v19L20 59Z" fill="#bd8755" stroke="#e1bb7e" />
          <path d="M27 41l63 30-28-31-36-20Z" fill="#d7b97f" />
          <path d="M76 17L40 74" stroke="#cfb585" strokeWidth="4" />
          <circle cx="77" cy="15" r="5" fill="#ae4d3d" />
        </>
      )}
      {kind === 'latch' && (
        <>
          <path d="M12 43h96v22H12Z" fill="#806f50" stroke="#b4a076" strokeWidth="3" />
          <path d="M28 28v51m57-51v51" stroke="#41483e" strokeWidth="9" />
          <circle cx="34" cy="85" r="4" fill="#a84736" />
        </>
      )}
      {kind === 'plate' && (
        <>
          <ellipse
            cx="60"
            cy="68"
            rx="48"
            ry="20"
            fill="#849788"
            stroke="#c6cbb0"
            strokeWidth="3"
          />
          <ellipse cx="60" cy="66" rx="32" ry="12" fill="#b7b58f" />
          <path d="M40 65l15-4 13 6 12-5" stroke="#9c7757" strokeWidth="7" />
        </>
      )}
      {kind === 'torch' && (
        <g transform="rotate(25 60 50)">
          <path d="M45 32h30v58H45Z" fill="#3f5556" stroke="#87958a" strokeWidth="3" />
          <path d="M38 10h44v24H38Z" fill="#84958b" />
          <ellipse cx="60" cy="10" rx="22" ry="7" fill="#e2ddba" />
        </g>
      )}
      {kind === 'sign' && (
        <>
          <path d="M25 12h70v65H25Z" fill="#756c4d" stroke="#d2bd82" strokeWidth="3" />
          <path d="M59 79v17" stroke="#77694b" strokeWidth="7" />
          <text x="60" y="48" fontSize="13" textAnchor="middle" fill="#e9d9ac">
            {name.slice(0, 4)}
          </text>
        </>
      )}
      {broken && (
        <path d="M10 3L35 33L24 48L61 72L50 97" stroke="#372e32" strokeWidth="4" fill="none" />
      )}
    </svg>
  );
}
