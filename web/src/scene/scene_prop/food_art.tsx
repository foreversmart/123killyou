export function FoodArt({ id }: { id: string }) {
  const buns = id === 'bread';
  const greens = id === 'local_vegetables';
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true">
      <ellipse cx="60" cy="72" rx="49" ry="11" fill="#111b184d" />
      <ellipse cx="60" cy="59" rx="50" ry="22" fill="#8c9b85" stroke="#d1c7a8" strokeWidth="2" />
      <ellipse cx="60" cy="56" rx="42" ry="16" fill={buns ? '#bcae8c' : '#465744'} />
      {buns ? (
        <g stroke="#c0ae8d" strokeWidth="1.5">
          <path d="M29 52Q20 23 42 20Q63 17 64 47Q50 60 29 52Z" fill="#e9dfc7" />
          <path d="M56 48Q53 13 76 15Q97 16 99 49Q81 59 56 48Z" fill="#f0e6cc" />
          <path d="M41 65Q33 36 57 34Q80 32 83 63Q65 74 41 65Z" fill="#f5ebd2" />
          <path d="M37 31q7-5 14 0M69 26q8-5 16 0M50 46q8-6 16-1" fill="none" stroke="#fff6de" />
        </g>
      ) : greens ? (
        <>
          <g fill="#748759" stroke="#a8ae74" strokeWidth="1.4">
            <path d="M23 56Q18 34 42 40L58 58Q34 68 23 56Z" />
            <path d="M49 53Q46 30 67 35L78 58Q62 69 49 53Z" />
            <path d="M70 56Q80 31 98 45L94 62Q78 68 70 56Z" />
          </g>
          <g fill="#99795a" stroke="#c2a783" strokeWidth="1.4">
            <path d="M34 45Q36 25 55 37L59 44Z" />
            <path d="M69 48Q74 27 92 42L94 49Z" />
            <path d="M49 60Q55 41 74 56L75 63Z" />
          </g>
          <path d="M44 45l1 8m37-4 1 9m-19 5 1 7" stroke="#d5c59c" strokeWidth="4" />
        </>
      ) : (
        <g fill="none" strokeLinecap="round">
          <path
            d="M28 53l15-9 15 8 17-10 16 9M32 61l13-7 17 8 15-8 13 4"
            stroke="#ad9864"
            strokeWidth="6"
          />
          <path d="M35 45l4 17m15-17 4 14m14-14 5 14" stroke="#728055" strokeWidth="4" />
          <path d="M42 50l5-2m17 8 7-3m8-3 6 3" stroke="#d1b880" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
