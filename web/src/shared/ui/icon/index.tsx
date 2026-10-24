export function Icon({
  kind,
  className = '',
}: {
  kind: 'map' | 'journal' | 'seal';
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      {kind === 'map' ? (
        <>
          <path d="M5 10l12-4 14 5 12-5v32l-12 5-14-5-12 4zM17 6v32m14-27v32" />
          <path d="M11 19l13 8 12-11m-12 7v8m-4-4h8" />
        </>
      ) : kind === 'journal' ? (
        <>
          <path d="M8 7h24l8 8v27H8zM32 7v10h8M15 23h18m-18 7h18m-18 7h12" />
          <path d="M15 13h9" />
        </>
      ) : (
        <>
          <path d="M24 4L43 24 24 44 5 24zM24 10v28M10 24h28" />
          <circle cx="24" cy="24" r="10" />
          <path d="M15 16l18 16m0-16L15 32" />
        </>
      )}
    </svg>
  );
}
