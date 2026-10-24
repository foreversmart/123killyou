import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserCheck } from '@/features/startup/browser_check';
import { BrowserRequirements } from '@/features/startup/browser_requirements';
import type { HtmlCanvasSupport } from '@/shared/lib/htmlCanvas';
import { LoadingScreen } from '@/shared/ui/loading_screen';

const Game = lazy(() => import('@/app/game'));

export default function Startup() {
  const [support, setSupport] = useState<HtmlCanvasSupport | null>(null);

  useEffect(() => {
    // Retry blocked startup on return; a passed check must not restart an active game.
    if (!support || support.supported) return;
    const check = () => setSupport(null);
    window.addEventListener('focus', check);
    return () => {
      window.removeEventListener('focus', check);
    };
  }, [support]);

  if (!support) return <BrowserCheck onComplete={setSupport} />;
  if (!support.supported) return <BrowserRequirements support={support} />;

  return (
    <Suspense fallback={<LoadingScreen error="" />}>
      <Game />
    </Suspense>
  );
}
