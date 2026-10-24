package httpapi

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

type spokenProvider struct{}

func (spokenProvider) Synthesize(context.Context, string, session.SpeechSink) (session.DialogueAudio, error) {
	return session.DialogueAudio{PCM: []byte{0, 0, 2, 0}, SampleRate: 24000}, nil
}

func (spokenProvider) Respond(context.Context, session.DialogueRequest) (session.DialogueResponse, error) {
	return session.DialogueResponse{Text: "云端台词", Audio: &session.DialogueAudio{PCM: []byte{0, 0, 2, 0}, SampleRate: 24000}}, nil
}
func TestAudioEndpointReturnsWAVForCommittedTurn(t *testing.T) {
	repo, err := sqlite.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer repo.Close()
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	service := session.New(repo, game.NewEngine(catalog), spokenProvider{})
	state, err := service.Resume()
	if err != nil {
		t.Fatal(err)
	}
	result, err := service.Command(state.ID, state.RunID, "audio-request", "你是谁")
	if err != nil || !result.HasAudio {
		t.Fatalf("audio command: %v", err)
	}
	server := httptest.NewServer(NewRouter(service))
	defer server.Close()
	path := "/api/sessions/" + state.ID + "/runs/" + state.RunID + "/audio/audio-request"
	response, err := http.Get(server.URL + path)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	raw, _ := io.ReadAll(response.Body)
	if response.StatusCode != 200 || response.Header.Get("Content-Type") != "audio/wav" || response.Header.Get("Cache-Control") != "no-store" {
		t.Fatal("audio transport headers incorrect")
	}
	if len(raw) != 48 || string(raw[:4]) != "RIFF" || binary.LittleEndian.Uint32(raw[24:]) != 24000 || binary.LittleEndian.Uint32(raw[40:]) != 4 {
		t.Fatal("WAV header or samples lost")
	}
	replay, err := service.Command(state.ID, state.RunID, "audio-request", "你是谁")
	if err != nil || replay.State.Revision != result.State.Revision {
		t.Fatal("fetching audio repeated game action")
	}
	if _, err := service.Command(state.ID, state.RunID, "reset", "重新开始"); err != nil {
		t.Fatal(err)
	}
	missing, err := http.Get(server.URL + path)
	if err != nil {
		t.Fatal(err)
	}
	defer missing.Body.Close()
	if missing.StatusCode != 404 {
		t.Fatal("old run audio still available")
	}
}

func TestHealthDoesNotTreatConfiguredProviderAsConnected(t *testing.T) {
	service, err := openTestService(t, ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer service.Close()
	server := httptest.NewServer(NewRouter(service))
	defer server.Close()
	response, err := http.Get(server.URL + "/api/health")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	var status struct {
		Connected bool                   `json:"qiniuConnected"`
		Linx      session.DialogueStatus `json:"linx"`
	}
	if err := json.NewDecoder(response.Body).Decode(&status); err != nil {
		t.Fatal(err)
	}
	if status.Connected || !strings.Contains(status.Linx.State, "disabled") {
		t.Fatal("disabled provider reported cloud connectivity")
	}
}
