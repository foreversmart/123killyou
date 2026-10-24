package session_test

import (
	"context"
	"errors"
	"testing"

	"nightwatch/internal/session"
)

type roleProvider struct {
	fakeDialogueProvider
	requests []session.SpeechRequest
	fail     bool
}

func (p *roleProvider) Synthesize(_ context.Context, request session.SpeechRequest, emit session.SpeechSink) (session.DialogueAudio, error) {
	p.requests = append(p.requests, request)
	if p.fail {
		return session.DialogueAudio{}, errors.New("unavailable")
	}
	if emit != nil {
		if err := emit(session.SpeechEvent{Kind: "start", SampleRate: 16000}); err != nil {
			return session.DialogueAudio{}, err
		}
	}
	return session.DialogueAudio{PCM: []byte{0, 0}, SampleRate: 16000}, nil
}

func TestSystemNarrationAndRuleAuthoredNPCLinesUseTheirOwnRoles(t *testing.T) {
	for _, test := range []struct{ text, setup, npc string }{
		{"看看地图", "", ""},
		{"去走廊", "", ""},
		{"回休息室", "去走廊", "keeper"},
		{"把红烛给守夜人", "", "keeper"},
		{"把铜钥匙给守夜人", "", "keeper"},
		{"重新开始", "", ""},
	} {
		t.Run(test.text, func(t *testing.T) {
			p := &roleProvider{}
			service := audioService(t, p)
			before, err := service.Resume()
			if err != nil {
				t.Fatal(err)
			}
			if test.setup != "" {
				result, err := service.Command(before.ID, before.RunID, "setup", test.setup)
				if err != nil {
					t.Fatal(err)
				}
				before = result.State
			}
			p.requests = nil
			p.fail = true
			result, err := service.Command(before.ID, before.RunID, "role", test.text)
			if err != nil || result.SpeakerID != test.npc || result.VoiceError == "" {
				t.Fatalf("wrong committed role: %+v %v", result, err)
			}
			p.fail = false
			var speaker string
			replayed, err := service.CommandStream(context.Background(), before.ID, before.RunID, "role", test.text, func(event session.SpeechEvent) error {
				if event.Kind == "start" {
					speaker = event.Speaker
				}
				return nil
			})
			if err != nil || replayed.State.Revision != result.State.Revision || !replayed.HasAudio {
				t.Fatalf("retry repeated action or lost audio: %v", err)
			}
			if len(p.requests) != 2 {
				t.Fatalf("unexpected TTS calls: %d", len(p.requests))
			}
			for _, request := range p.requests {
				if request.NPCID != test.npc || request.Text != result.Speak {
					t.Fatalf("wrong TTS role: %+v", request)
				}
			}
			if test.npc == "keeper" && speaker != "守夜人" || test.npc == "" && speaker != "系统" {
				t.Fatalf("replay label differs from voice: %s", speaker)
			}
		})
	}
}
