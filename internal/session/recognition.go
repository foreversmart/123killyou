package session

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"
)

// AudioSource yields 20ms frames of 16kHz mono PCM16LE. EOF means key release.
type AudioSource func(context.Context) ([]byte, error)
type SpeechRecognizer interface {
	Transcribe(context.Context, AudioSource, func() error) (string, error)
}

var ErrRecognition = errors.New("灵矽语音识别未完成，请按住空格重试。")

// Recognition never creates a game turn, checkpoint or NPC memory by itself.
func (s *Service) Recognize(ctx context.Context, id, runID string, source AudioSource, ready func() error) (string, error) {
	before, err := s.Snapshot(id)
	if err != nil {
		return "", err
	}
	if before.RunID != runID {
		return "", ErrStaleRun
	}
	recognizer, ok := s.provider.(SpeechRecognizer)
	if !ok {
		return "", ErrRecognition
	}
	text, err := recognizer.Transcribe(ctx, source, ready)
	if err != nil {
		return "", ErrRecognition
	}
	text = strings.TrimSpace(text)
	if utf8.RuneCountInString(text) > 1000 {
		return "", ErrRecognition
	}
	after, err := s.Snapshot(id)
	if err != nil {
		return "", err
	}
	if before.RunID != after.RunID || before.Revision != after.Revision {
		return "", ErrStaleRun
	}
	return text, nil
}
