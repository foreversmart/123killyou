package session_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

type streamingProvider struct {
	calls int
}

func (p *streamingProvider) Synthesize(_ context.Context, text string, emit session.SpeechSink) (session.DialogueAudio, error) {
	p.calls++
	if emit != nil {
		for _, event := range []session.SpeechEvent{{Kind: "start", SampleRate: 16000}, {Kind: "text", Text: text}, {Kind: "audio", PCM: []byte{1, 0}}} {
			if err := emit(event); err != nil {
				return session.DialogueAudio{}, err
			}
		}
	}
	return session.DialogueAudio{PCM: []byte{1, 0}, SampleRate: 16000}, nil
}
func (p *streamingProvider) Respond(ctx context.Context, request session.DialogueRequest) (session.DialogueResponse, error) {
	audio, err := p.Synthesize(ctx, "云端台词。", request.OnSpeech)
	return session.DialogueResponse{Text: "云端台词。", Audio: &audio}, err
}

func TestVoiceCancellationKeepsAlreadyCommittedActions(t *testing.T) {
	for _, text := range []string{"去走廊", "把铜钥匙给守夜人", "保存为取消测试", "重新开始"} {
		t.Run(text, func(t *testing.T) {
			provider := &streamingProvider{}
			service := audioService(t, provider)
			before, _ := service.Resume()
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			_, err := service.CommandStream(ctx, before.ID, before.RunID, "cancelled", text, func(event session.SpeechEvent) error {
				if event.Kind == "audio" {
					cancel()
				}
				return nil // Ignored cancellation still cannot cache the old audio.
			})
			if !errors.Is(err, context.Canceled) {
				t.Fatalf("cancellation was lost: %v", err)
			}
			after, _ := service.Snapshot(before.ID)
			if after.Revision != before.Revision+1 {
				t.Fatal("voice cancellation rolled back action")
			}
			if text == "去走廊" && after.Room != "corridor" {
				t.Fatal("movement lost")
			}
			if text == "把铜钥匙给守夜人" && !after.Flags["keyDelivered"] {
				t.Fatal("reward lost")
			}
			if _, found := service.SpeechAudio(before.ID, before.RunID, "cancelled"); found {
				t.Fatal("cancelled audio cached")
			}
			listed, err := service.Command(before.ID, after.RunID, "list", "看看存档")
			if text == "保存为取消测试" && (err != nil || !strings.Contains(listed.Speak, "取消测试")) {
				t.Fatal("voice cancellation lost saved checkpoint")
			}
		})
	}
}

func TestCommittedStreamRetryReplaysSpeechWithoutRepeatingReward(t *testing.T) {
	provider := &streamingProvider{}
	service := audioService(t, provider)
	before, _ := service.Resume()
	var results []game.Result
	for i := 0; i < 2; i++ {
		var events []session.SpeechEvent
		result, err := service.CommandStream(context.Background(), before.ID, before.RunID, "reward", "把铜钥匙给守夜人", func(event session.SpeechEvent) error {
			events = append(events, event)
			return nil
		})
		if err != nil {
			t.Fatal(err)
		}
		results = append(results, result)
		if len(events) != 3 || events[0].Speaker == "" || events[0].Portrait == "" || events[2].Kind != "audio" {
			t.Fatalf("stream metadata missing: %+v", events)
		}
	}
	if provider.calls != 1 || results[0].State.Revision != results[1].State.Revision || !results[1].State.Flags["keyDelivered"] {
		t.Fatal("stream retry regenerated speech or repeated game turn")
	}
}
