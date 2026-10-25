package linx

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestEnsureAgentUpdatesExistingPrefixedAgent(t *testing.T) {
	var methods []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		methods = append(methods, r.Method+" "+r.URL.Path)
		if r.Header.Get("Authorization") != "Bearer test-secret" {
			t.Fatalf("missing bearer authentication")
		}
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/xiaozhi/agent/list":
			_, _ = w.Write([]byte(`{"code":0,"data":[{"id":"agent-1","agentName":"1024-keeper","assistantName":"守夜人"}],"nextCursor":""}`))
		case r.Method == http.MethodPut && r.URL.Path == "/xiaozhi/agent/agent-1":
			_, _ = w.Write([]byte(`{"code":0,"data":{}}`))
		default:
			t.Fatalf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
	}))
	defer server.Close()
	client := New(Config{APIKey: "test-secret", APIBase: server.URL, RequestLimit: time.Second})
	id, err := client.EnsureAgent(context.Background(), AgentSpec{Name: "1024-keeper", AssistantName: "守夜人"})
	if err != nil || id != "agent-1" {
		t.Fatalf("EnsureAgent() = %q, %v", id, err)
	}
	if strings.Join(methods, ",") != "GET /xiaozhi/agent/list,PUT /xiaozhi/agent/agent-1" {
		t.Fatalf("unexpected calls: %v", methods)
	}
}

func TestEnsureAgentRejectsUnprefixedName(t *testing.T) {
	client := New(Config{APIKey: "test-secret"})
	if _, err := client.EnsureAgent(context.Background(), AgentSpec{Name: "keeper"}); err == nil {
		t.Fatal("unprefixed test agent name was accepted")
	}
}

func TestEnsureAgentFollowsOpaqueCursorWithoutCreatingDuplicate(t *testing.T) {
	const cursor = "page+two/with=padding&marker"
	listed, updated := 0, false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == http.MethodGet && r.URL.Path == "/xiaozhi/agent/list":
			listed++
			if listed == 1 {
				_, _ = w.Write([]byte(`{"code":0,"data":[{"id":"other","agentName":"existing-agent"}],"nextCursor":"` + cursor + `"}`))
				return
			}
			if listed != 2 || r.URL.Query().Get("cursor") != cursor || len(r.URL.Query()) != 2 {
				t.Error("pagination cursor was changed or interpreted as query parameters")
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			_, _ = w.Write([]byte(`{"code":0,"data":[{"id":"keeper","agentName":"1024-keeper"}]}`))
		case r.Method == http.MethodPut && r.URL.Path == "/xiaozhi/agent/keeper":
			updated = true
			_, _ = w.Write([]byte(`{"code":0}`))
		default:
			t.Errorf("unexpected mutation: %s %s", r.Method, r.URL.Path)
			w.WriteHeader(http.StatusBadRequest)
		}
	}))
	defer server.Close()
	client := New(Config{APIKey: "test-secret", APIBase: server.URL, RequestLimit: time.Second})
	id, err := client.EnsureAgent(context.Background(), AgentSpec{Name: "1024-keeper"})
	if err != nil || id != "keeper" || listed != 2 || !updated {
		t.Fatalf("existing paginated agent was not reused: id=%q pages=%d updated=%t err=%v", id, listed, updated, err)
	}
}
