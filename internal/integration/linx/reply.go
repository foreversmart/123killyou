package linx

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/coder/websocket"
	"nightwatch/internal/session"
)

func readReply(ctx context.Context, conn *websocket.Conn, params audioParams, expected string, emit session.SpeechSink) (session.DialogueResponse, error) {
	var text strings.Builder
	var pcm []byte
	started, emitted := false, 0
	push := func(event session.SpeechEvent) error {
		if emit == nil {
			return nil
		}
		return emit(event)
	}
	begin := func() error {
		if started {
			return nil
		}
		started = true
		return push(session.SpeechEvent{Kind: "start", SampleRate: params.SampleRate})
	}
	for {
		kind, payload, err := conn.Read(ctx)
		if err != nil {
			return session.DialogueResponse{}, fmt.Errorf("linx response: %w", err)
		}
		if kind == websocket.MessageBinary {
			if !started {
				continue
			}
			if expected != "" && text.Len() == 0 {
				return session.DialogueResponse{}, errors.New("linx speech arrived before its confirmed text")
			}
			if len(pcm)+len(payload) > 2<<20 {
				return session.DialogueResponse{}, errors.New("linx response audio exceeded limit")
			}
			pcm = append(pcm, payload...)
			// Network frame boundaries need not coincide with 16-bit samples.
			aligned := len(pcm) &^ 1
			if aligned > emitted {
				if err := push(session.SpeechEvent{Kind: "audio", PCM: pcm[emitted:aligned]}); err != nil {
					return session.DialogueResponse{}, err
				}
				emitted = aligned
			}
			continue
		}
		var event wireEvent
		if json.Unmarshal(payload, &event) != nil {
			return session.DialogueResponse{}, errors.New("linx returned invalid control JSON")
		}
		if event.ErrorCode != 0 || event.Type == "error" || event.Error != "" {
			return session.DialogueResponse{}, fmt.Errorf("linx rejected dialogue (code %d)", event.ErrorCode)
		}
		if event.Type != "tts" {
			continue
		}
		switch event.State {
		case "start":
			if err := begin(); err != nil {
				return session.DialogueResponse{}, err
			}
		case "sentence_start":
			if err := begin(); err != nil {
				return session.DialogueResponse{}, err
			}
			text.WriteString(event.Text)
			if text.Len() > 16000 {
				return session.DialogueResponse{}, errors.New("linx response text exceeded limit")
			}
			if expected != "" && !strings.HasPrefix(strings.TrimSpace(expected), strings.TrimSpace(text.String())) {
				return session.DialogueResponse{}, errors.New("linx speech did not match the confirmed result")
			}
			if err := push(session.SpeechEvent{Kind: "text", Text: event.Text}); err != nil {
				return session.DialogueResponse{}, err
			}
		case "stop":
			if event.Aborted || strings.TrimSpace(text.String()) == "" {
				return session.DialogueResponse{}, errors.New("linx returned an empty or interrupted reply")
			}
			if len(pcm) == 0 || len(pcm)%2 != 0 {
				return session.DialogueResponse{}, errors.New("linx returned no usable speech audio")
			}
			return session.DialogueResponse{Text: strings.TrimSpace(text.String()), Audio: &session.DialogueAudio{PCM: pcm, SampleRate: params.SampleRate}}, nil
		}
	}
}
