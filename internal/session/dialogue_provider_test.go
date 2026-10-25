package session_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

type fakeDialogueProvider struct {
	text  string
	err   error
	seen  session.DialogueRequest
	calls int
}

func (p *fakeDialogueProvider) Respond(_ context.Context, request session.DialogueRequest) (session.DialogueResponse, error) {
	p.calls++
	p.seen = request
	return session.DialogueResponse{Text: p.text, Audio: &session.DialogueAudio{PCM: []byte{0, 0}, SampleRate: 16000}}, p.err
}

func (p *fakeDialogueProvider) Synthesize(context.Context, session.SpeechRequest, session.SpeechSink) (session.DialogueAudio, error) {
	return session.DialogueAudio{PCM: []byte{0, 0}, SampleRate: 16000}, p.err
}

func TestDialogueProviderOnlyChangesNPCWordingAfterLocalSettlement(t *testing.T) {
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	provider := &fakeDialogueProvider{text: "云端回应，但规则仍归后端。"}
	service := session.New(repo, game.NewEngine(catalog), provider)
	seedRuleSave(t, repo, service, catalog)
	state, err := service.Resume()
	if err != nil {
		t.Fatal(err)
	}
	result, err := service.Command(state.ID, state.RunID, "cloud-dialogue", "你是谁")
	if err != nil {
		t.Fatal(err)
	}
	if result.Intent != "dialogue" || result.Speak != provider.text || result.State.Dialogue.Text != provider.text {
		t.Fatalf("provider reply was not applied: %+v", result)
	}
	if provider.calls != 1 || provider.seen.NPCID != "keeper" || provider.seen.GameContext == "" {
		t.Fatalf("provider request lost game context: %+v", provider)
	}
}

func TestDialogueProviderFailureDoesNotEmitLocalNPCReplyOrCommitTurn(t *testing.T) {
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	provider := &fakeDialogueProvider{err: errors.New("temporary linx failure")}
	service := session.New(repo, game.NewEngine(catalog), provider)
	seedRuleSave(t, repo, service, catalog)
	state, err := service.Resume()
	if err != nil {
		t.Fatal(err)
	}
	result, err := service.Command(state.ID, state.RunID, "fallback-dialogue", "你是谁")
	if !errors.Is(err, session.ErrLinxUnavailable) || result.Speak != "" {
		t.Fatalf("cloud failure used local fallback: %+v, %v", result, err)
	}
	after, _ := service.Snapshot(state.ID)
	if after.Revision != state.Revision || after.Dialogue != state.Dialogue {
		t.Fatal("failed cloud dialogue advanced game state")
	}
}

func TestActionCommitsBeforeSpeechAndSurvivesCloudFailure(t *testing.T) {
	for _, text := range []string{"看看地图", "把铜钥匙给守夜人", "保存为云端失败", "重新开始"} {
		t.Run(text, func(t *testing.T) {
			provider := &fakeDialogueProvider{err: errors.New("cloud unavailable")}
			service := audioService(t, provider)
			before, _ := service.Resume()
			result, err := service.Command(before.ID, before.RunID, "failed-speech", text)
			if err != nil || result.VoiceError == "" || result.HasAudio {
				t.Fatalf("committed action lost voice failure: %+v %v", result, err)
			}
			after, _ := service.Snapshot(before.ID)
			if after.Revision != before.Revision+1 {
				t.Fatal("speech failure rolled back action")
			}
			if text == "看看地图" && after.Overlay != "map" {
				t.Fatal("map did not open")
			}
			if text == "把铜钥匙给守夜人" && !after.Flags["keyDelivered"] {
				t.Fatal("item was not delivered")
			}
			provider.err = nil
			retry, err := service.Command(before.ID, before.RunID, "failed-speech", text)
			if err != nil || retry.State.Revision != result.State.Revision {
				t.Fatal("speech retry repeated action")
			}
			listed, err := service.Command(before.ID, after.RunID, "list", "看看存档")
			if text == "保存为云端失败" && (err != nil || !strings.Contains(listed.Speak, "云端失败")) {
				t.Fatal("checkpoint was not saved")
			}
		})
	}
}

func TestMissingLinxProviderNeverStartsLocalDialogue(t *testing.T) {
	service := audioService(t, nil)
	state, _ := service.Resume()
	if result, err := service.Command(state.ID, state.RunID, "missing", "闲聊天气"); !errors.Is(err, session.ErrLinxUnavailable) || result.Speak != "" {
		t.Fatal("missing provider used local dialogue")
	}
}
