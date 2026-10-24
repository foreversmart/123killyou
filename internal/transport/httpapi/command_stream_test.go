package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

type heldSpeech struct {
	release   <-chan struct{}
	cancelled chan struct{}
}

func (p heldSpeech) Synthesize(ctx context.Context, request session.SpeechRequest, emit session.SpeechSink) (session.DialogueAudio, error) {
	for _, event := range []session.SpeechEvent{{Kind: "start", SampleRate: 16000}, {Kind: "text", Text: request.Text}, {Kind: "audio", PCM: []byte{1, 0}}} {
		if err := emit(event); err != nil {
			return session.DialogueAudio{}, err
		}
	}
	select {
	case <-p.release:
	case <-ctx.Done():
		if p.cancelled != nil {
			close(p.cancelled)
		}
		return session.DialogueAudio{}, ctx.Err()
	}
	return session.DialogueAudio{PCM: []byte{1, 0}, SampleRate: 16000}, nil
}
func (p heldSpeech) Respond(ctx context.Context, request session.DialogueRequest) (session.DialogueResponse, error) {
	audio, err := p.Synthesize(ctx, session.SpeechRequest{Text: "云端回应。"}, request.OnSpeech)
	return session.DialogueResponse{Text: "云端回应。", Audio: &audio}, err
}
func streamServer(t *testing.T, provider session.DialogueProvider) (*session.Service, string, game.State) {
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
	service := session.New(repo, game.NewEngine(catalog), provider)
	state, err := service.Resume()
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(NewRouter(service))
	t.Cleanup(server.Close)
	return service, server.URL + "/api/sessions/" + state.ID + "/commands/stream", state
}
func streamingRequest(t *testing.T, ctx context.Context, url string, before game.State) *http.Response {
	t.Helper()
	body := `{"runId":"` + before.RunID + `","requestId":"stream","text":"看看地图"}`
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 3 * time.Second}
	response, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { response.Body.Close() })
	return response
}
func TestHTTPFlushesCommittedActionBeforeSpeech(t *testing.T) {
	release := make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	service, url, before := streamServer(t, heldSpeech{release: release})
	response := streamingRequest(t, context.Background(), url, before)
	if response.StatusCode != 200 || response.Header.Get("Content-Type") != "application/x-ndjson" || response.Header.Get("Cache-Control") != "no-store" {
		t.Fatal("incorrect stream headers")
	}
	decoder := json.NewDecoder(response.Body)
	var action game.Result
	if err := decoder.Decode(&action); err != nil {
		t.Fatal(err)
	}
	if action.Type != "action" || action.State.Overlay != "map" || action.State.Revision != before.Revision+1 {
		t.Fatal("action did not precede speech")
	}

	for _, kind := range []string{"start", "text", "audio"} {
		var message struct {
			Type      string
			RequestID string
			Speech    session.SpeechEvent
		}
		if err := decoder.Decode(&message); err != nil {
			t.Fatal(err)
		}
		if message.Type != "speech" || message.RequestID != "stream" || message.Speech.Kind != kind {
			t.Fatalf("incorrect streamed message: %+v", message)
		}
	}
	current, _ := service.Snapshot(before.ID)
	if current.Revision != before.Revision+1 || current.Overlay != "map" {
		t.Fatal("action waits for cloud completion")
	}
	once.Do(func() { close(release) })
	var final game.Result
	if err := decoder.Decode(&final); err != nil {
		t.Fatal(err)
	}
	if final.Type != "state" || final.State.Revision != before.Revision+1 || final.State.Overlay != "map" {
		t.Fatalf("missing final settlement: %+v", final)
	}
}
func TestHTTPCancellationStopsSpeechAndKeepsAction(t *testing.T) {
	release, cancelled := make(chan struct{}), make(chan struct{})
	defer close(release)
	service, url, before := streamServer(t, heldSpeech{release: release, cancelled: cancelled})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	response := streamingRequest(t, ctx, url, before)
	decoder := json.NewDecoder(response.Body)
	for range 3 {
		var message map[string]any
		if err := decoder.Decode(&message); err != nil {
			t.Fatal(err)
		}
	}
	cancel()
	select {
	case <-cancelled:
	case <-time.After(time.Second):
		t.Fatal("HTTP cancellation did not reach cloud provider")
	}
	after, _ := service.Snapshot(before.ID)
	if after.Revision != before.Revision+1 || after.Overlay != "map" {
		t.Fatal("cancelled voice rolled back map")
	}
}
