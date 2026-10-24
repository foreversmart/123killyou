package linx

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/coder/websocket"
	"nightwatch/internal/session"
)

// Transcribe uses the same bound software device, but never forwards the
// agent's automatic reply. STT is returned to the authoritative game rules.
func (c *Client) Transcribe(ctx context.Context, source session.AudioSource, ready func() error) (text string, err error) {
	ctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()
	defer func() {
		if err != nil && ctx.Err() == nil {
			c.deviceFailure("recognition_failed", err)
		}
	}()
	select {
	case c.turns <- struct{}{}:
		defer func() { <-c.turns }()
	case <-ctx.Done():
		return "", ctx.Err()
	}
	conn, hello, err := c.connect(ctx, "本连接只识别玩家语音，不执行游戏行动。")
	if err != nil {
		return "", err
	}
	defer conn.CloseNow()
	control := func(kind, state string) error {
		return conn.Write(ctx, websocket.MessageText, mustJSON(map[string]string{
			"type": kind, "state": state, "mode": "manual", "session_id": hello.SessionID,
		}))
	}
	if err := control("listen", "start"); err != nil {
		return "", err
	}
	if ready != nil {
		if err := ready(); err != nil {
			return "", err
		}
	}
	total := 0
	for {
		pcm, err := source(ctx)
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return "", err
		}
		total += len(pcm)
		if len(pcm) != 640 || total > 16000*2*30 {
			return "", errors.New("invalid microphone PCM frame or duration")
		}
		if err := conn.Write(ctx, websocket.MessageBinary, pcm); err != nil {
			return "", err
		}
	}
	if total == 0 {
		return "", nil
	}
	if err := control("listen", "stop"); err != nil {
		return "", err
	}
	final, end := context.WithTimeout(ctx, 10*time.Second)
	defer end()
	for {
		kind, raw, err := conn.Read(final)
		if err != nil {
			return "", fmt.Errorf("linx STT: %w", err)
		}
		if kind != websocket.MessageText {
			continue
		}
		var event wireEvent
		if json.Unmarshal(raw, &event) != nil {
			return "", errors.New("invalid linx STT event")
		}
		if event.ErrorCode != 0 || event.Type == "error" || event.Error != "" {
			return "", errors.New("linx rejected recognition")
		}
		if event.Type != "stt" {
			continue
		}
		if event.SessionID != "" && hello.SessionID != "" && event.SessionID != hello.SessionID {
			return "", errors.New("linx STT session mismatch")
		}
		text = strings.TrimSpace(event.Text)
		if utf8.RuneCountInString(text) > 1000 {
			return "", errors.New("linx STT exceeded text limit")
		}
		// Linx normally continues from STT into LLM/TTS. Stop this connection before
		// opening the separate, rule-controlled reply turn. No audio is forwarded.
		abortCtx, abortCancel := context.WithTimeout(ctx, time.Second)
		_ = conn.Write(abortCtx, websocket.MessageText, mustJSON(map[string]string{"type": "abort", "session_id": hello.SessionID, "reason": "wake_word_detected"}))
		abortCancel()
		return text, nil
	}
}
