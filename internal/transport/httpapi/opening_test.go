package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

func TestOpeningPreviewsFirstSceneWithoutChangingAutosave(t *testing.T) {
	service, err := openTestService(t, ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer service.Close()
	server := httptest.NewServer(NewRouter(service))
	defer server.Close()
	opening := func() game.State {
		t.Helper()
		response, err := http.Get(server.URL + "/api/story/opening")
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		if response.StatusCode != http.StatusOK || response.Header.Get("Cache-Control") != "no-store" {
			t.Fatalf("opening headers: status=%d cache=%q", response.StatusCode, response.Header.Get("Cache-Control"))
		}
		var state game.State
		if err := json.NewDecoder(response.Body).Decode(&state); err != nil {
			t.Fatal(err)
		}
		assertOpeningScene(t, state)
		if state.ID != "" || state.RunID != "" {
			t.Fatal("opening preview created a playable session")
		}
		return state
	}
	opening()
	err = service.repo.Transaction(func(tx session.Transaction) error {
		_, err := tx.AutoSave()
		if !errors.Is(err, session.ErrSession) {
			t.Fatalf("opening wrote an autosave: %v", err)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	response, err := http.Post(server.URL+"/api/sessions", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusCreated {
		t.Fatalf("new game: HTTP %d", response.StatusCode)
	}
	var fresh game.State
	if err := json.NewDecoder(response.Body).Decode(&fresh); err != nil {
		t.Fatal(err)
	}
	assertOpeningScene(t, fresh)
	if fresh.ID == "" || fresh.RunID == "" {
		t.Fatal("new game has no session identity")
	}
	progressed, err := service.Command(fresh.ID, fresh.RunID, "register", "登记入住")
	if err != nil || progressed.State.SceneKey != "mini_register" {
		t.Fatalf("advance saved game: %v", err)
	}
	opening()
	resumed, err := service.Resume()
	if err != nil || !reflect.DeepEqual(resumed, progressed.State) {
		t.Fatalf("opening preview changed the player's progress: %v", err)
	}
}

func assertOpeningScene(t *testing.T, state game.State) {
	t.Helper()
	if state.SceneKey != "mini_arrival" || state.Room != "gate" || !state.StoryMode || state.Dialogue.Speaker != "旁白" {
		t.Fatalf("not the first scene: scene=%s room=%s story=%v speaker=%s", state.SceneKey, state.Room, state.StoryMode, state.Dialogue.Speaker)
	}
	if len(state.Actors) != 5 || len(state.SceneProps) == 0 || len(state.Inventory) != 0 {
		t.Fatal("first-scene actors, props or empty inventory missing")
	}
}

func TestHealthIdentifiesOpeningContract(t *testing.T) {
	service, err := openTestService(t, ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer service.Close()
	response := httptest.NewRecorder()
	NewRouter(service).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	var health struct {
		Story           string `json:"story"`
		OpeningContract string `json:"openingContract"`
	}
	if err := json.NewDecoder(response.Body).Decode(&health); err != nil {
		t.Fatal(err)
	}
	if response.Code != http.StatusOK || health.Story != "mini_script" || health.OpeningContract != "mini_arrival_v1" {
		t.Fatalf("dev launcher cannot identify the updated opening: %+v", health)
	}
}
