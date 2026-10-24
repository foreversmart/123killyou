import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameSession } from '@/features/session/useGameSession';
import { useRoomTransition } from '@/scene/room/useRoomTransition';
import { useVoice } from '@/features/voice/useVoice';
import { useDemoTour } from './useDemoTour';

export function useGameController() {
  const { state: incomingState, error, connected, send } = useGameSession();
  const { state, phase: roomPhase } = useRoomTransition(incomingState);
  const [notice, setNotice] = useState('');
  const [systemNotice, setSystemNotice] = useState(false);
  const latestAction = useRef(0);
  const act = useCallback(
    async (text: string) => {
      const action = ++latestAction.current;
      const result = await send(text);
      if (action !== latestAction.current) return '';
      setSystemNotice(
        [
          'save_checkpoint',
          'load_checkpoint',
          'checkpoints',
          'save',
          'resume_save',
          'clarify',
          'reset',
        ].includes(result.intent || ''),
      );
      if (result.intent !== 'dialogue' && result.intent !== 'give')
        setNotice(result.state.lastAction);
      else setNotice('');
      return result.speak?.trim() || result.state.lastAction?.trim() || '';
    },
    [send],
  );
  const voice = useVoice(act);
  const voiceStarted = !['idle', 'unsupported', 'error'].includes(voice.status);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6500);
    return () => clearTimeout(timer);
  }, [notice]);

  const { demo, demoText, tour } = useDemoTour(act, setNotice);
  const showNotice = Boolean(
    notice &&
    state &&
    incomingState?.room === state.room &&
    roomPhase !== 'leaving' &&
    roomPhase !== 'black' &&
    (systemNotice || (!state.overlay && !state.paused && !state.caught)),
  );
  return {
    state,
    error,
    connected,
    voice,
    voiceStarted,
    roomPhase,
    notice,
    showNotice,
    demo,
    demoText,
    tour,
  };
}
