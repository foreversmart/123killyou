import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameSession } from '@/features/session/useGameSession';
import { useRoomTransition } from '@/scene/room/useRoomTransition';
import { useVoice } from '@/features/voice/useVoice';
import { useDemoTour } from './useDemoTour';
import { useStoryPlayback } from './useStoryPlayback';
import { useOpeningFlow } from './useOpeningFlow';
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
  const [sceneReady, setSceneReady] = useState(false);
  const [travelActive, setTravelActive] = useState(false);
  const sceneAvailable = useRef(false);
  sceneAvailable.current = sceneReady && !travelActive;
  const [systemNotice, setSystemNotice] = useState(false);
  const {
    openingPhase,
    openingGate,
    finishOpeningVideo,
    startOpening,
    finishOpening,
    journeyReady,
    setJourneyReady,
  } = useOpeningFlow();
  const openingFlow = openingPhase !== 'done';
  const openingAnnounced = useRef(false);
  const voicePriming = useRef(false);
  const latestAction = useRef(0);
  const act = useCallback(
    async (text: string, controls?: Partial<TurnControls>) => {
      const action = ++latestAction.current;
      const gate = openingGate.current;
      const openingAlightingDialogue =
        gate === 'alighting' && text.replace(/[“”"。，！？!?\s]/g, '') === '听第一话';
      if (gate !== 'done' && !openingAlightingDialogue) {
        if (gate !== 'ready') {
          setNotice(gate === 'reel' ? '片头播放结束后，请说“开始游戏”。' : '山门将近，请稍候。');
          return { text: '', streamed: false, problem: '', sceneOnly: true };
        }
        if (!/(开始游戏|开始旅程|进入游戏)/.test(text.replace(/[“”"。，！？!?\s]/g, ''))) {
          setNotice('请说“开始游戏”开始旅程。');
          return { text: '', streamed: false, problem: '', sceneOnly: true };
        }
        startOpening();
        setNotice('');
        return { text: '', streamed: false, problem: '', sceneOnly: true };
      }
      if (!sceneAvailable.current)
        return {
          text: '',
          streamed: false,
          problem: '场景正在准备或转场，请等待画面停稳后再行动。',
          sceneOnly: true,
        };
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
    [openingGate, send, startOpening],
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
  useStoryPlayback(
    incomingState,
    voice,
    !openingFlow && connected && sceneReady && !travelActive && roomPhase === 'idle' && !soundBusy,
  );
  useEffect(() => {
    // Start the first line as the stopped-bus frame fades in. send() creates a
    // session if needed, and the dialogue panel is mounted over that frame.
    const alighting = openingPhase === 'alighting' && journeyReady;
    if ((openingFlow && !alighting) || openingAnnounced.current || !connected || !state) return;
    if (state.sceneKey !== 'mini_arrival' || state.flags.arrival_intro_linlan) return;
    openingAnnounced.current = true;
    void voiceSession.submit('听第一话');
  }, [openingFlow, openingPhase, journeyReady, connected, state, voiceSession.submit]);
  const begin = useCallback(async () => {
    void voiceSession.enablePlayback();
    await voiceSession.submit('开始游戏');
  }, [voiceSession.enablePlayback, voiceSession.submit]);
  const resume = useCallback(async () => {
    const announced = openingAnnounced.current;
    openingAnnounced.current = true;
    try {
      const playback = voiceSession.enablePlayback();
      await enter('resume');
      await playback;
      finishOpening();
      await voiceSession.submit('重听当前对白');
    } catch {
      openingAnnounced.current = announced;
      // Keep the opening choices available so the player can retry.
    }
  }, [enter, finishOpening, voiceSession.enablePlayback, voiceSession.submit]);
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
    sceneReady,
    setSceneReady,
    setTravelActive,
    error,
    connected,
    opening,
    openingFlow,
    openingPhase,
    setJourneyReady,
    finishOpeningVideo,
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
