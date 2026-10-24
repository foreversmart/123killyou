import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameSession } from '@/features/session/useGameSession';
import { useRoomTransition } from '@/scene/room/useRoomTransition';
import { useVoice } from '@/features/voice/useVoice';
import { useDemoTour } from './useDemoTour';
import type { GameResult, TurnControls } from '@/shared/types/game';

export function useGameController() {
  const { state: incomingState, error, connected, send, openTranscription } = useGameSession();
  const { state, phase: roomPhase } = useRoomTransition(incomingState);
  const [notice, setNotice] = useState('');
  const [systemNotice, setSystemNotice] = useState(false);
  const latestAction = useRef(0);
  const act = useCallback(
    async (text: string, controls?: TurnControls) => {
      const action = ++latestAction.current;
      let announced = false;
      const announce = (result: GameResult) => {
        if (action !== latestAction.current || announced) return;
        announced = true;
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
      };
      const { result, streamed } = await send(text, { ...controls, onAction: announce });
      if (action !== latestAction.current) return '';
      announce(result);
      const textReply = result.speak?.trim() || result.state.lastAction?.trim() || '';
      return { text: textReply, streamed, problem: result.voiceError };
    },
    [send],
  );
  const voice = useVoice(act, openTranscription);
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
