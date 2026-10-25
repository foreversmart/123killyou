package session_test

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

type audioDialogueProvider struct {
	calls   atomic.Int32
	entered chan struct{}
	release chan struct{}
}

func (p *audioDialogueProvider) Synthesize(context.Context, session.SpeechRequest, session.SpeechSink) (session.DialogueAudio, error) {
	return session.DialogueAudio{PCM: []byte{0, 0}, SampleRate: 16000}, nil
}

func (p *audioDialogueProvider) Respond(context.Context, session.DialogueRequest) (session.DialogueResponse, error) {
	if p.calls.Add(1) == 1 && p.entered != nil {
		close(p.entered)
		<-p.release
	}
	return session.DialogueResponse{Text: "云端回应", Audio: &session.DialogueAudio{PCM: []byte{0, 0, 1, 0}, SampleRate: 24000}}, nil
}
func audioService(t *testing.T, p session.DialogueProvider) *session.Service {
	t.Helper()
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { repo.Close() })
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	service := session.New(repo, game.NewEngine(catalog), p)
	seedRuleSave(t, repo, service, catalog)
	return service
}

func TestConcurrentTransportRetriesMakeOneCloudCall(t *testing.T) {
	p := &audioDialogueProvider{entered: make(chan struct{}), release: make(chan struct{})}
	service := audioService(t, p)
	state, err := service.Resume()
	if err != nil {
		t.Fatal(err)
	}
	var workers sync.WaitGroup
	results := make(chan game.Result, 2)
	call := func() {
		defer workers.Done()
		r, err := service.Command(state.ID, state.RunID, "same-request", "你是谁")
		if err != nil {
			t.Error(err)
		}
		results <- r
	}
	workers.Add(1)
	go call()
	select {
	case <-p.entered:
	case <-time.After(time.Second):
		t.Fatal("cloud request did not start")
	}
	workers.Add(1)
	go call()
	close(p.release)
	workers.Wait()
	close(results)
	for result := range results {
		if !result.HasAudio || result.Speak != "云端回应" || result.State.Revision != state.Revision+1 {
			t.Fatal("retry changed original result")
		}
	}
	if p.calls.Load() != 1 {
		t.Fatal("transport retry repeated cloud generation")
	}
	audio, found := service.SpeechAudio(state.ID, state.RunID, "same-request")
	if !found || len(audio.PCM) != 4 || audio.SampleRate != 24000 {
		t.Fatal("committed response lost audio")
	}
	if _, err := service.Command(state.ID, state.RunID, "new-run", "重新开始"); err != nil {
		t.Fatal(err)
	}
	if _, found := service.SpeechAudio(state.ID, state.RunID, "same-request"); found {
		t.Fatal("old run's speech remained playable after reset")
	}
}

func TestAudioCacheDoesNotLeakAcrossSessions(t *testing.T) {
	p := &audioDialogueProvider{}
	service := audioService(t, p)
	first, _ := service.Create()
	second, _ := service.Create()
	result, err := service.Command(first.ID, first.RunID, "voice", "你是谁")
	if err != nil || !result.HasAudio {
		t.Fatal("missing audio")
	}
	if _, found := service.SpeechAudio(second.ID, second.RunID, "voice"); found {
		t.Fatal("audio crossed sessions")
	}
	if _, found := service.SpeechAudio(first.ID, first.RunID, "unknown"); found {
		t.Fatal("unknown request found audio")
	}
}
