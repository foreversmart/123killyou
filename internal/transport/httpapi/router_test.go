package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

func TestResumeAndCommandsAcrossServerRestart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "game.db")
	open := func() (*testService, *httptest.Server) {
		s, err := openTestService(t, path)
		if err != nil {
			t.Fatal(err)
		}
		h := httptest.NewServer(NewRouter(s))
		t.Cleanup(func() { h.Close(); s.Close() })
		return s, h
	}
	s, server := open()
	post := func(path string, body any, want int, into any) {
		t.Helper()
		raw, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		response, err := http.Post(server.URL+path, "application/json", bytes.NewReader(raw))
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		if response.StatusCode != want {
			t.Fatalf("%s: HTTP %d, want %d", path, response.StatusCode, want)
		}
		if into != nil {
			if err := json.NewDecoder(response.Body).Decode(into); err != nil {
				t.Fatal(err)
			}
		}
	}
	var state game.State
	post("/api/sessions/resume", nil, 200, &state)
	var moved game.Result
	input := command{Type: "command", RunID: state.RunID, RequestID: "move", Text: "去走廊"}
	post("/api/sessions/"+state.ID+"/commands", input, 200, &moved)
	if moved.State.Room != "corridor" {
		t.Fatal("HTTP 指令未移动房间")
	}
	server.Close()
	s.Close()
	_, server = open()
	var resumed game.State
	post("/api/sessions/resume", nil, 200, &resumed)
	if resumed.ID != state.ID || resumed.RunID != state.RunID || resumed.Room != "corridor" || resumed.Revision != moved.State.Revision {
		t.Fatal("服务重启或新浏览器丢失自动存档")
	}
	var replay game.Result
	post("/api/sessions/"+state.ID+"/commands", input, 200, &replay)
	if replay.State.Revision != moved.State.Revision {
		t.Fatal("HTTP 重试被重复结算")
	}
	var reset game.Result
	post("/api/sessions/"+state.ID+"/commands", command{Type: "command", RunID: resumed.RunID, RequestID: "reset", Text: "重新开始"}, 200, &reset)
	input.RequestID = "late"
	post("/api/sessions/"+state.ID+"/commands", input, 409, nil)
	input.RunID = ""
	post("/api/sessions/"+state.ID+"/commands", input, 400, nil)
}

func TestWebSocketSurvivesStaleBranchError(t *testing.T) {
	s, err := openTestService(t, ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	state, err := s.Resume()
	if err != nil {
		t.Fatal(err)
	}
	h := httptest.NewServer(NewRouter(s))
	defer h.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(h.URL, "http")+"/api/sessions/"+state.ID+"/stream", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.CloseNow()
	var result game.Result
	if err := wsjson.Read(ctx, conn, &result); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Command(state.ID, state.RunID, "other-tab-reset", "重新开始"); err != nil {
		t.Fatal(err)
	}
	if err := wsjson.Write(ctx, conn, command{Type: "command", RunID: state.RunID, RequestID: "stale", Text: "去走廊"}); err != nil {
		t.Fatal(err)
	}
	if err := wsjson.Read(ctx, conn, &result); err != nil {
		t.Fatal(err)
	}
	if result.Type != "error" || result.RequestID != "stale" || result.State.RunID == state.RunID || result.State.Room != "watch" {
		t.Fatal("WS 未返回错误和可恢复的当前进度")
	}
	if err := wsjson.Write(ctx, conn, command{Type: "command", RunID: result.State.RunID, RequestID: "new", Text: "去走廊"}); err != nil {
		t.Fatal(err)
	}
	if err := wsjson.Read(ctx, conn, &result); err != nil {
		t.Fatal(err)
	}
	if result.Type != "state" || result.State.Room != "corridor" {
		t.Fatal("WS 错误后不能继续操作")
	}
}

type testService struct {
	*session.Service
	repo *sqlite.Repository
}

func (s *testService) Close() error { return s.repo.Close() }
func openTestService(t *testing.T, path string) (*testService, error) {
	t.Helper()
	repo, err := sqlite.Open(path)
	if err != nil {
		return nil, err
	}
	t.Cleanup(func() { repo.Close() })
	catalog, err := content.Load()
	if err != nil {
		return nil, err
	}
	return &testService{session.New(repo, game.NewEngine(catalog), spokenProvider{}), repo}, nil
}
