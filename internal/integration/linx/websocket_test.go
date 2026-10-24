package linx

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"nightwatch/internal/session"
)

func mockDevice(t *testing.T, handler func(context.Context, *websocket.Conn)) *Client {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer device-token" || r.Header.Get("Client-Id") != "fixed-client-id" {
			t.Error("handshake used incorrect credentials")
		}
		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			t.Error(err)
			return
		}
		defer conn.CloseNow()
		handler(r.Context(), conn)
	}))
	t.Cleanup(server.Close)
	c := New(Config{APIKey: "management-secret", KeeperAgent: "agent", NarratorAgent: "narrator", RequestLimit: time.Second})
	c.identity = DeviceIdentity{DeviceID: "02:00:00:00:00:01", ClientID: "fixed-client-id"}
	c.access = deviceAccess{URL: "ws" + strings.TrimPrefix(server.URL, "http"), Token: "device-token"}
	c.accessAt = time.Now()
	c.device = DeviceStatus{State: "ready", Bound: true}
	return c
}

func exchangeHello(t *testing.T, ctx context.Context, conn *websocket.Conn) {
	t.Helper()
	_, raw, err := conn.Read(ctx)
	if err != nil {
		t.Error(err)
		return
	}
	var hello map[string]any
	if json.Unmarshal(raw, &hello) != nil || hello["type"] != "hello" {
		t.Error("client hello missing")
	}
	conn.Write(ctx, websocket.MessageText, []byte(`{"type":"hello","transport":"websocket","agent_id":"agent","session_id":"cloud-session","audio_params":{"format":"pcm","sample_rate":24000,"channels":1}}`))
	_, raw, err = conn.Read(ctx)
	if err != nil {
		t.Error(err)
		return
	}
	var listen struct {
		Text  string `json:"text"`
		State string `json:"state"`
	}
	if json.Unmarshal(raw, &listen) != nil || listen.Text != "你是谁" || listen.State != "detect" {
		t.Error("text turn missing")
	}
}

func TestRespondCollectsNegotiatedPCMAndSubtitles(t *testing.T) {
	c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
		exchangeHello(t, ctx, conn)
		for _, event := range []string{`{"type":"tts","state":"start"}`, `{"type":"tts","state":"sentence_start","text":"守夜人。"}`} {
			conn.Write(ctx, websocket.MessageText, []byte(event))
		}
		conn.Write(ctx, websocket.MessageBinary, []byte{1, 0, 2, 0})
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"sentence_start","text":"你是谁？"}`))
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"stop"}`))
	})
	reply, err := c.Respond(context.Background(), session.DialogueRequest{PlayerText: "你是谁", GameContext: "房间=守夜室"})
	if err != nil {
		t.Fatal(err)
	}
	if reply.Text != "守夜人。你是谁？" || reply.Audio == nil || len(reply.Audio.PCM) != 4 || reply.Audio.SampleRate != 24000 {
		t.Fatalf("missing text/audio: %+v", reply)
	}
	if !c.DeviceStatus().Connected || c.DeviceStatus().LastReplyAt == "" {
		t.Fatal("successful cloud turn was not recorded")
	}
}

func TestRespondRejectsBindingErrorsEmptyAndAbortedReplies(t *testing.T) {
	for _, event := range []string{`{"type":"stt","error_code":10001,"text":"请去绑定智能体"}`, `{"type":"tts","state":"stop"}`, `{"type":"tts","state":"stop","is_aborted":true}`} {
		t.Run(event, func(t *testing.T) {
			c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
				exchangeHello(t, ctx, conn)
				conn.Write(ctx, websocket.MessageText, []byte(event))
			})
			if _, err := c.Respond(context.Background(), session.DialogueRequest{PlayerText: "你是谁"}); err == nil {
				t.Fatal("failed cloud turn accepted")
			}
			if c.DeviceStatus().Connected || c.DeviceStatus().LastError == "" {
				t.Fatal("failure not reflected in diagnostics")
			}
		})
	}
}

func TestRespondHonorsDeadline(t *testing.T) {
	c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) { exchangeHello(t, ctx, conn); conn.Read(ctx) })
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	if _, err := c.Respond(ctx, session.DialogueRequest{PlayerText: "你是谁"}); err == nil {
		t.Fatal("stalled reply did not time out")
	}
}

func TestSynthesizeRequiresConfirmedTextAndAudio(t *testing.T) {
	for _, spoken := range []string{"地图已展开。", "你获得了铜钥匙。"} {
		t.Run(spoken, func(t *testing.T) {
			c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
				conn.Read(ctx)
				conn.Write(ctx, websocket.MessageText, []byte(`{"type":"hello","transport":"websocket","agent_id":"narrator","audio_params":{"format":"pcm","sample_rate":16000,"channels":1}}`))
				_, raw, err := conn.Read(ctx)
				if err != nil {
					t.Error(err)
					return
				}
				var listen map[string]any
				if json.Unmarshal(raw, &listen) != nil || listen["text_response"] != "地图已展开。" {
					t.Error("confirmed speech was not sent via text_response")
				}
				conn.Write(ctx, websocket.MessageText, mustJSON(map[string]string{"type": "tts", "state": "sentence_start", "text": spoken}))
				conn.Write(ctx, websocket.MessageBinary, []byte{1, 0, 2, 0})
				conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"stop"}`))
			})
			audio, err := c.Synthesize(context.Background(), session.SpeechRequest{Text: "地图已展开。"}, nil)
			if spoken == "地图已展开。" {
				if err != nil || len(audio.PCM) != 4 || !c.DialogueStatus().Verified {
					t.Fatalf("confirmed speech missing: %v", err)
				}
			} else if err == nil || c.DialogueStatus().Verified || c.DialogueStatus().LastError == "" {
				t.Fatalf("mismatched speech accepted or marked healthy: %v", err)
			}
		})
	}
}
