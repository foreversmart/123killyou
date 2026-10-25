import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameSession } from '@/features/session/useGameSession';
import { useRoomTransition } from '@/scene/room/useRoomTransition';
import { useVoice } from '@/features/voice/useVoice';
import { useDemoTour } from './useDemoTour';
import { useStoryPlayback } from './useStoryPlayback';
import { useStorySound } from '@/features/story_audio/useStorySound';
import type { GameResult, TurnControls } from '@/shared/types/game';

export function useGameController({ voiceReady = false }: { voiceReady?: boolean } = {}) {
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
  const [openingFlow, setOpeningFlow] = useState(true);
  const [openingReady, setOpeningReady] = useState(false);
  const openingGate = useRef<'video' | 'ready' | 'done'>('video');
  const voicePriming = useRef(false);
  const latestAction = useRef(0);
  const act = useCallback(
    async (text: string, controls?: Partial<TurnControls>) => {
      const action = ++latestAction.current;
      const gate = openingGate.current;
      if (gate !== 'done') {
        if (gate !== 'ready') {
          setNotice('片头播放结束后，请说“开始游戏”。');
          return { text: '', streamed: false, problem: '', sceneOnly: true };
        }
        if (!/(开始游戏|开始旅程|进入游戏)/.test(text.replace(/[“”"。，！？!?\s]/g, ''))) {
          setNotice('请说“开始游戏”开始旅程。');
          return { text: '', streamed: false, problem: '', sceneOnly: true };
        }
        openingGate.current = 'done';
        setOpeningReady(false);
        setOpeningFlow(false);
        text = '听第一话';
      }
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
        if (
          result.state.storyMode &&
          ![
            'save_checkpoint',
            'load_checkpoint',
            'checkpoints',
            'save',
            'resume_save',
            'clarify',
            'reset',
          ].includes(result.intent || '')
        )
          setNotice('');
        else if (result.intent !== 'dialogue' && result.intent !== 'give')
          setNotice(result.state.lastAction);
        else setNotice('');
      };
      const { result, streamed } = await send(text, {
        ...controls,
        onAction: announce,
      });
      if (action !== latestAction.current) return '';
      announce(result);
      const sceneOnly = Boolean(
        result.state.storyMode && !result.speak?.trim() && !result.state.dialogue.text,
      );
      const textReply = sceneOnly
        ? ''
        : result.speak?.trim() || result.state.lastAction?.trim() || '';
      return { text: textReply, streamed, problem: result.voiceError, sceneOnly };
    },
    [send],
  );
  const voiceSession = useVoice(act, openTranscription);
  const connectVoice = useCallback(
    async (announce: boolean) => {
      try {
        const playback = voiceSession.enablePlayback();
        await enter();
        await playback;
        const started = await voiceSession.start();
        if (started && announce) await voiceSession.submit(opening ? '听第一话' : '重听当前对白');
        return started;
      } catch {
        return false;
      }
    },
    [enter, opening, voiceSession.enablePlayback, voiceSession.start, voiceSession.submit],
  );
  const startVoice = useCallback(async () => {
    return connectVoice(true);
  }, [connectVoice]);
  const voice = { ...voiceSession, start: startVoice };
  useEffect(() => {
    if (!voiceReady || !openingFlow || voiceSession.microphoneOn || voicePriming.current) return;
    voicePriming.current = true;
    void connectVoice(false).finally(() => {
      voicePriming.current = false;
    });
  }, [connectVoice, openingFlow, voiceReady, voiceSession.microphoneOn]);
  const soundBusy = useStorySound(state, voice.status);
  useStoryPlayback(incomingState, voice, connected && roomPhase === 'idle' && !soundBusy);
  const begin = useCallback(async () => {
    await act('开始游戏');
  }, [act]);
  const resume = useCallback(async () => {
    try {
      const playback = voiceSession.enablePlayback();
      await enter('resume');
      await playback;
      await voiceSession.submit('重听当前对白');
    } catch {
      // Keep the opening choices available so the player can retry.
    }
  }, [enter, voiceSession.enablePlayback, voiceSession.submit]);
  const voiceStarted = voice.microphoneOn;

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
    openingFlow,
    openingReady,
    setOpeningReady: useCallback(() => {
      openingGate.current = 'ready';
      setOpeningReady(true);
    }, []),
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
