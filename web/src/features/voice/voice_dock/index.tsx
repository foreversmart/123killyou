import { useVoice, type VoiceStatus } from '../useVoice';
import { Waveform } from '../waveform';
import styles from './style.module.css';

const statusLabels: Record<VoiceStatus, string> = {
  idle: '语音待启用',
  starting: '正在连接',
  listening: '等待你说话',
  recording: '正在录音',
  hearing: '正在录音',
  transcribing: '正在识别',
  processing: '正在理解',
  speaking: '正在回应',
  error: '识别暂不可用',
  unsupported: '浏览器不支持',
};

export function VoiceDock({
  voice,
  demo,
  paused,
  connected,
  onTour,
}: {
  voice: ReturnType<typeof useVoice>;
  demo: boolean;
  paused: boolean;
  connected: boolean;
  onTour: () => Promise<void>;
}) {
  const voiceStarted = !['idle', 'unsupported', 'error'].includes(voice.status);
  const recording = voice.status === 'recording' || voice.status === 'hearing';
  return (
    <div className={styles['voice-dock']} data-recording={recording}>
      {voiceStarted || demo ? (
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
      ) : (
        <>
          <button
            className={styles['start-voice']}
            onClick={() => void voice.start()}
            disabled={!connected}
          >
            {voice.status === 'error' ? '重新连接语音' : '开启语音会话'}
            <span>→</span>
          </button>
          <small>允许麦克风后，按住空格说话</small>
          <button
            className={styles['watch-tour']}
            onClick={() => void onTour()}
            disabled={!connected}
          >
            先看一遍演示
          </button>
        </>
      )}
    </div>
  );
}
