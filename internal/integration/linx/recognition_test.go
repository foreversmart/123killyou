package linx

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func TestRecognitionUploadsManualPCMAndAbortsAutomaticReply(t *testing.T) {
	aborted := make(chan struct{}, 1)
	c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
		conn.Read(ctx)
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"hello","transport":"websocket","agent_id":"agent","session_id":"speech","audio_params":{"format":"pcm","sample_rate":24000,"channels":1}}`))
		_, raw, _ := conn.Read(ctx)
		var start map[string]string
		if json.Unmarshal(raw, &start) != nil || start["state"] != "start" || start["mode"] != "manual" || start["session_id"] != "speech" {
			t.Error("manual listen start missing")
		}
		kind, pcm, err := conn.Read(ctx)
		if err != nil || kind != websocket.MessageBinary || len(pcm) != 640 || pcm[0] != 42 {
			t.Error("microphone PCM was not forwarded")
		}
		_, raw, _ = conn.Read(ctx)
		var stop map[string]string
		if json.Unmarshal(raw, &stop) != nil || stop["state"] != "stop" {
			t.Error("key release missing")
		}
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"stt","session_id":"speech","text":"看看地图"}`))
		_, raw, err = conn.Read(ctx)
		var abort map[string]string
		if err == nil && json.Unmarshal(raw, &abort) == nil && abort["type"] == "abort" {
			aborted <- struct{}{}
		}
	})
	frames := 0
	ready := false
	text, err := c.Transcribe(context.Background(), func(context.Context) ([]byte, error) {
		if !ready {
			t.Error("input read before cloud was ready")
		}
		frames++
		if frames > 1 {
			return nil, io.EOF
		}
		pcm := make([]byte, 640)
		pcm[0] = 42
		return pcm, nil
	}, func() error { ready = true; return nil })
	if err != nil || text != "看看地图" {
		t.Fatalf("STT missing: %q %v", text, err)
	}
	select {
	case <-aborted:
	case <-time.After(time.Second):
		t.Fatal("automatic reply not aborted")
	}
}

func TestRecognitionCancellationAndInvalidPCMReleaseDevice(t *testing.T) {
	c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
		conn.Read(ctx)
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"hello","transport":"websocket","agent_id":"agent","audio_params":{"format":"pcm","sample_rate":16000,"channels":1}}`))
		conn.Read(ctx)
		conn.Read(ctx)
	})
	ctx, cancel := context.WithCancel(context.Background())
	_, err := c.Transcribe(ctx, func(context.Context) ([]byte, error) { cancel(); return nil, ctx.Err() }, nil)
	if !errors.Is(err, context.Canceled) {
		t.Fatal("recognition cancellation lost")
	}
	_, err = c.Transcribe(context.Background(), func(context.Context) ([]byte, error) { return []byte{1}, nil }, nil)
	if err == nil {
		t.Fatal("invalid PCM accepted")
	}
}
