package linx

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestConfiguredVoicesMustExistInAuthenticatedCatalog(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/voices" || r.Header.Get("Authorization") != "Bearer test-key" {
			t.Error("wrong voice catalog request")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"code":0,"data":{"voices":[{"id":"voice-a"},{"id":"voice-b"}]}}`))
	}))
	defer server.Close()
	c := New(Config{APIKey: "test-key", APIBase: server.URL})
	if err := c.ValidateVoices(context.Background(), map[string]string{"linlan": "voice-a", "zhouyan": "voice-b"}); err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{"", "not-present"} {
		if err := c.ValidateVoices(context.Background(), map[string]string{"linlan": id}); err == nil {
			t.Fatal("unavailable voice silently fell back")
		}
	}
	if err := c.ValidateVoices(context.Background(), map[string]string{"linlan": "voice-a", "xuzhi": "voice-a"}); err == nil {
		t.Fatal("different characters silently shared one voice")
	}
}

func TestRoleRegistryRejectsUnknownAgentAndCopiesInput(t *testing.T) {
	roles := map[string]string{"linlan": "lin-agent", "keeper": "keeper-agent", "narrator": "narrator-agent"}
	c := New(Config{RoleAgents: roles})
	roles["linlan"] = "other-agent"
	if id, err := c.agentForRole("linlan"); err != nil || id != "lin-agent" {
		t.Fatal("caller modified configured agent")
	}
	c.SetRoleAgents(roles)
	roles["linlan"] = "changed-again"
	if id, err := c.agentForRole("linlan"); err != nil || id != "other-agent" {
		t.Fatal("caller modified registered agent")
	}
	if _, err := c.agentForRole("intruder"); err == nil || c.projectAgent("not-this-project") || c.projectAgent("") {
		t.Fatal("unknown role or agent was accepted")
	}
}
