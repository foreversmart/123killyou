package httpapi

import (
	"context"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"nightwatch/internal/session"
)

type testRecognition struct {
	heldSpeech
	cancelled chan struct{}
}

func (p testRecognition) Transcribe(ctx context.Context, source session.AudioSource, ready func() error) (string, error) {
	if err := ready(); err != nil {
		return "", err
	}
	for {
		_, err := source(ctx)
		if err == io.EOF {
			return "看看地图", nil
		}
		if err != nil {
			if p.cancelled != nil {
				close(p.cancelled)
			}
			return "", err
		}
	}
}
func TestRecognitionSocketTransmitsAudioWithoutExecutingAction(t *testing.T) {
	service, url, before := streamServer(t, testRecognition{})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	url = strings.Replace(strings.TrimSuffix(url, "/commands/stream"), "http:", "ws:", 1) + "/recognition"
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.CloseNow()
	wsjson.Write(ctx, conn, map[string]string{"type": "start", "runId": before.RunID})
	var message map[string]string
	if err := wsjson.Read(ctx, conn, &message); err != nil || message["type"] != "ready" {
		t.Fatal("recognition not ready", err)
	}
	conn.Write(ctx, websocket.MessageBinary, make([]byte, 640))
	wsjson.Write(ctx, conn, map[string]string{"type": "stop"})
	if err := wsjson.Read(ctx, conn, &message); err != nil || message["text"] != "看看地图" {
		t.Fatal("transcript missing", err)
	}
	after, _ := service.Snapshot(before.ID)
	if after.Revision != before.Revision || after.Overlay != before.Overlay {
		t.Fatal("recognition changed game state")
	}
}

func TestClosingRecognitionSocketCancelsCloudInput(t *testing.T) {
	cancelled := make(chan struct{})
	_, url, before := streamServer(t, testRecognition{cancelled: cancelled})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	url = strings.Replace(strings.TrimSuffix(url, "/commands/stream"), "http:", "ws:", 1) + "/recognition"
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatal(err)
	}
	wsjson.Write(ctx, conn, map[string]string{"type": "start", "runId": before.RunID})
	var message map[string]string
	if err := wsjson.Read(ctx, conn, &message); err != nil {
		t.Fatal(err)
	}
	conn.CloseNow()
	select {
	case <-cancelled:
	case <-ctx.Done():
		t.Fatal("cloud input survived browser cancellation")
	}
}
