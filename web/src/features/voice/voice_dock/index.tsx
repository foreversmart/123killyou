import { useVoice, type VoiceStatus } from '@/features/voice/useVoice';
import { Waveform } from '@/features/voice/waveform';
import styles from './style.module.css';

const statusLabels: Record<VoiceStatus, string> = {
  idle: '对白播放已开启',
  starting: '正在连接',
  listening: '等待你说话',
  recording: '正在录音',
  hearing: '正在录音',
  transcribing: '正在识别',
  processing: '正在理解',
  speaking: '正在播放对白',
  error: '识别暂不可用',
  unsupported: '浏览器不支持',
};

export function VoiceDock({
  voice,
  demo,
  paused,
  connected,
  storyMode,
  onTour,
  showTour = true,
}: {
  voice: ReturnType<typeof useVoice>;
  demo: boolean;
  paused: boolean;
  connected: boolean;
  storyMode: boolean;
  onTour: () => Promise<void>;
  showTour?: boolean;
}) {
  const starting = voice.status === 'starting';
  const showActivity = voice.playbackOn || voice.microphoneOn || starting || demo;
  const recording = voice.status === 'recording' || voice.status === 'hearing';
  return (
    <div className={styles['voice-dock']} data-recording={recording}>
      {showActivity && (
        <>
          <div className={styles['voice-wave-row']}>
            <span className={styles['voice-light']} />
            <Waveform level={voice.level} status={demo ? 'demo' : voice.status} />
          </div>
          <span className={styles['voice-state']} aria-live="polite">
            {demo ? '正在演示' : paused ? '等待你回来' : statusLabels[voice.status]}
          </span>
          <small>
            {demo ? (
              '画面由真实游戏状态驱动'
            ) : !voice.microphoneOn ? (
              starting ? (
                '正在申请麦克风权限'
              ) : (
                '角色对白会自动播放'
              )
            ) : recording ? (
              <>
                松开 <kbd className={styles['talk-key']}>空格</kbd> 发送
              </>
            ) : voice.status === 'transcribing' ? (
              '灵矽正在识别语音'
            ) : (
              <>
                按住 <kbd className={styles['talk-key']}>空格</kbd>{' '}
                {voice.status === 'speaking' ? '打断并说话' : '说话'}
              </>
            )}
          </small>
        </>
      )}
      {!voice.microphoneOn && !demo && (
        <>
          <button
            className={styles['start-voice']}
            onClick={() => void voice.start()}
            disabled={!connected || starting}
          >
            {starting
              ? '正在连接麦克风'
              : voice.microphoneProblem
                ? '重新连接语音'
                : '开启语音会话'}
            <span>→</span>
          </button>
          <small>允许麦克风后，按住空格说话</small>
          {showTour && !storyMode && (
            <button
              className={styles['watch-tour']}
              onClick={() => void onTour()}
              disabled={!connected}
            >
              先看一遍演示
            </button>
          )}
        </>
      )}
    </div>
  );
}
