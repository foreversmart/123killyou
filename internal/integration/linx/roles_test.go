package linx

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"nightwatch/internal/session"
)

func TestRoleSelectedAtHandshakeWithoutRebinding(t *testing.T) {
	for _, role := range []string{"", "keeper", "player", "linlan", "zhouyan", "xuzhi", "huipu", "shangong"} {
		t.Run("npc="+role, func(t *testing.T) {
			want := "narrator"
			if role != "" {
				want = role
			}
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("X-Agent-ID") != want || r.Header.Get("Authorization") != "Bearer device-token" {
					t.Error("wrong role or credentials in handshake")
				}
				conn, err := websocket.Accept(w, r, nil)
				if err != nil {
					t.Error(err)
					return
				}
				defer conn.CloseNow()
				ctx := r.Context()
				if _, _, err := conn.Read(ctx); err != nil {
					return
				}
				conn.Write(ctx, websocket.MessageText, mustJSON(map[string]any{"type": "hello", "transport": "websocket", "agent_id": want, "audio_params": map[string]any{"format": "pcm", "sample_rate": 16000, "channels": 1}}))
				_, raw, err := conn.Read(ctx)
				if err != nil {
					t.Error(err)
					return
				}
				var listen map[string]any
				if json.Unmarshal(raw, &listen) != nil || listen["text_response"] != "测试。" {
					t.Error("rule text was not used for direct TTS")
				}
				conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"sentence_start","text":"测试。"}`))
				conn.Write(ctx, websocket.MessageBinary, []byte{1, 0})
				conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"stop"}`))
			}))
			defer server.Close()
			c := New(Config{APIKey: "management-key", KeeperAgent: "keeper", NarratorAgent: "narrator", RequestLimit: time.Second})
			c.SetRoleAgents(map[string]string{"player": "player", "linlan": "linlan", "zhouyan": "zhouyan", "xuzhi": "xuzhi", "huipu": "huipu", "shangong": "shangong"})
			c.identity = DeviceIdentity{DeviceID: "02:00:00:00:00:01", ClientID: "client"}
			c.access = deviceAccess{URL: "ws" + strings.TrimPrefix(server.URL, "http"), Token: "device-token"}
			c.accessAt = time.Now()
			if _, err := c.Synthesize(context.Background(), session.SpeechRequest{Text: "测试。", NPCID: role}, nil); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestMismatchedRoleCannotSilentlyUseDeviceDefault(t *testing.T) {
	for _, reported := range []string{"agent", "other-agent"} {
		c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
			conn.Read(ctx)
			conn.Write(ctx, websocket.MessageText, mustJSON(map[string]any{"type": "hello", "transport": "websocket", "agent_id": reported, "audio_params": map[string]any{"format": "pcm", "sample_rate": 16000, "channels": 1}}))
			if _, _, err := conn.Read(ctx); err == nil {
				t.Error("sent narration after wrong role acknowledgement")
			}
		})
		if _, err := c.Synthesize(context.Background(), session.SpeechRequest{Text: "测试。"}, nil); err == nil {
			t.Fatal("wrong voice role accepted")
		}
	}
}

func TestDocumentedHelloWithoutAgentIDAllowsRecognition(t *testing.T) {
	c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
		conn.Read(ctx)
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"hello","transport":"websocket","audio_params":{"format":"pcm","sample_rate":16000,"channels":1}}`))
		conn.Read(ctx)
	})
	ready := false
	if _, err := c.Transcribe(context.Background(), func(context.Context) ([]byte, error) { return nil, io.EOF }, func() error { ready = true; return nil }); err != nil || !ready {
		t.Fatalf("documented hello rejected: ready=%t err=%v", ready, err)
	}
}
