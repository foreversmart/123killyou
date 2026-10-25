import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameSession } from '@/features/session/useGameSession';
import { useRoomTransition } from '@/scene/room/useRoomTransition';
import { useVoice } from '@/features/voice/useVoice';
import { useDemoTour } from './useDemoTour';
import type { GameResult, TurnControls } from '@/shared/types/game';

export function useGameController() {
  const {
    state: incomingState,
    error,
    connected,
    opening,
    selecting,
    enter,
    send,
    openTranscription,
  } = useGameSession();
  const { state, phase: roomPhase } = useRoomTransition(incomingState);
  const [notice, setNotice] = useState('');
  const [systemNotice, setSystemNotice] = useState(false);
  const latestAction = useRef(0);
  const act = useCallback(
    async (text: string, controls?: Partial<TurnControls>) => {
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
      const { result, streamed } = await send(text, {
        ...controls,
        onAction: announce,
      });
      if (action !== latestAction.current) return '';
      announce(result);
      const textReply = result.speak?.trim() || result.state.lastAction?.trim() || '';
      return { text: textReply, streamed, problem: result.voiceError };
    },
    [send],
  );
  const voiceSession = useVoice(act, openTranscription);
  const startVoice = useCallback(async () => {
    try {
      await enter();
      const started = await voiceSession.start();
      if (started && opening) await voiceSession.submit('听第一话');
      return started;
    } catch {
      // Session failures are displayed by useGameSession.
      return false;
    }
  }, [enter, opening, voiceSession.start, voiceSession.submit]);
  const voice = { ...voiceSession, start: startVoice };
  const begin = useCallback(async () => {
    try {
      await enter();
      await voiceSession.submit('听第一话');
    } catch {
      // Keep the opening choices available when the server cannot start a session.
    }
  }, [enter, voiceSession.submit]);
  const resume = useCallback(async () => {
    try {
      await enter('resume');
    } catch {
      // Keep the opening choices available so the player can retry.
    }
  }, [enter]);
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
    opening,
    selecting,
    begin,
    resume,
    voice,
    voiceStarted,
    roomPhase,
    notice,
    showNotice,
    demo,
    demoText,
    tour,
    act,
  };
}
