import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRequirements } from '@/features/startup/browser_requirements';
import { checkHtmlCanvasSupport } from '@/shared/lib/htmlCanvas';
import { LoadingScreen } from '@/shared/ui/loading_screen';

const Game = lazy(() => import('@/app/game'));

export default function Startup() {
  const [support, setSupport] = useState(checkHtmlCanvasSupport);

  useEffect(() => {
    const check = () => setSupport(checkHtmlCanvasSupport());
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (!support.supported) return <BrowserRequirements missing={support.missing} />;

  return (
    <Suspense fallback={<LoadingScreen error="" />}>
      <Game />
    </Suspense>
  );
}
