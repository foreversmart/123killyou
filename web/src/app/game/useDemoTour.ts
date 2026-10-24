import { useCallback, useEffect, useRef, useState } from 'react';
import { demoSteps } from './demoSteps';
import type { VoiceAnswer } from '@/features/voice/types';
export function useDemoTour(
  act: (text: string) => Promise<VoiceAnswer>,
  onProblem: (text: string) => void,
) {
  const [demo, setDemo] = useState(false);
  const [demoText, setDemoText] = useState('');
  const demoStop = useRef(false);
  useEffect(
    () => () => {
      demoStop.current = true;
    },
    [],
  );
  const tour = useCallback(async () => {
    if (demo) return;
    setDemo(true);
    demoStop.current = false;
    const steps = demoSteps;
    try {
      for (const [text, delay] of steps) {
        if (demoStop.current) break;
        setDemoText(text);
        await act(text);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch {
      onProblem('演示连接中断，请检查本地游戏服务。');
    }
    setDemoText('');
    setDemo(false);
  }, [act, demo, onProblem]);

  return { demo, demoText, tour };
}
