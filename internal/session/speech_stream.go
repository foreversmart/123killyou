package session

import (
	"context"
	"nightwatch/internal/game"
)

// SpeechEvent carries voice output. Explicit actions are already committed
// when StateSink is called; cancelling their later voice never rolls them back.
type SpeechEvent struct {
	Kind       string `json:"kind"`
	Text       string `json:"text,omitempty"`
	PCM        []byte `json:"pcm,omitempty"`
	SampleRate int    `json:"sampleRate,omitempty"`
	Speaker    string `json:"speaker,omitempty"`
	Portrait   string `json:"portrait,omitempty"`
}

type SpeechSink func(SpeechEvent) error
type StateSink func(game.Result) error

func (s *Service) CommandStream(ctx context.Context, id, runID, requestID, text string, emit SpeechSink) (game.Result, error) {
	return s.command(ctx, id, runID, requestID, text, emit, nil)
}

func (s *Service) CommandLive(ctx context.Context, id, runID, requestID, text string, emit SpeechSink, action StateSink) (game.Result, error) {
	return s.command(ctx, id, runID, requestID, text, emit, action)
}

// A transport retry replays committed audio without repeating game actions.
func (s *Service) replaySpeech(ctx context.Context, result game.Result, emit SpeechSink) error {
	if emit == nil || !result.HasAudio {
		return nil
	}
	audio, found := s.SpeechAudio(result.State.ID, result.State.RunID, result.RequestID)
	if !found {
		return ErrLinxUnavailable
	}
	speaker, portrait := result.State.Dialogue.Speaker, result.State.Dialogue.Portrait
	if err := emit(SpeechEvent{Kind: "start", SampleRate: audio.SampleRate, Speaker: speaker, Portrait: portrait}); err != nil {
		return err
	}
	if err := emit(SpeechEvent{Kind: "text", Text: result.Speak}); err != nil {
		return err
	}
	for offset := 0; offset < len(audio.PCM); offset += 6400 {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := emit(SpeechEvent{Kind: "audio", PCM: audio.PCM[offset:min(offset+6400, len(audio.PCM))]}); err != nil {
			return err
		}
	}
	return nil
}
