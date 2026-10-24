package linx

import (
	"bytes"
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"
	"nightwatch/internal/session"
)

func TestReplyStreamsAlignedPCMBeforeTTSStop(t *testing.T) {
	release, heard := make(chan struct{}), make(chan struct{})
	var once sync.Once
	defer once.Do(func() { close(release) })
	c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
		exchangeHello(t, ctx, conn)
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"start"}`))
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"sentence_start","text":"守夜人。"}`))
		for _, part := range [][]byte{{1}, {0, 2}, {0}} {
			conn.Write(ctx, websocket.MessageBinary, part)
		}
		select {
		case <-release:
		case <-ctx.Done():
			return
		}
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"stop"}`))
	})
	var events []session.SpeechEvent
	var pcm []byte
	var first sync.Once
	done := make(chan error, 1)
	go func() {
		_, err := c.Respond(context.Background(), session.DialogueRequest{PlayerText: "你是谁", OnSpeech: func(event session.SpeechEvent) error {
			events = append(events, event)
			if event.Kind == "audio" {
				if len(event.PCM)%2 != 0 {
					return errors.New("unaligned sample")
				}
				pcm = append(pcm, event.PCM...)
				first.Do(func() { close(heard) })
			}
			return nil
		}})
		done <- err
	}()
	select {
	case <-heard:
	case <-time.After(time.Second):
		t.Fatal("audio was buffered until stop")
	}
	select {
	case <-done:
		t.Fatal("turn finished before cloud stop")
	default:
	}
	once.Do(func() { close(release) })
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	if len(events) != 4 || events[0].Kind != "start" || events[0].SampleRate != 24000 || events[1].Text != "守夜人。" || !bytes.Equal(pcm, []byte{1, 0, 2, 0}) {
		t.Fatalf("stream lost order, metadata or samples: %+v", events)
	}
}

func TestReplyRejectsMismatchedSystemTextBeforeForwardingAudio(t *testing.T) {
	c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
		exchangeHello(t, ctx, conn)
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"sentence_start","text":"你获得了钥匙。"}`))
		conn.Write(ctx, websocket.MessageBinary, []byte{1, 0})
	})
	_, err := c.exchange(context.Background(), session.DialogueRequest{PlayerText: "你是谁", AgentID: "agent"}, "地图已展开。", func(event session.SpeechEvent) error {
		if event.Kind == "text" || event.Kind == "audio" {
			t.Error("mismatched speech escaped validation")
		}
		return nil
	})
	if err == nil {
		t.Fatal("mismatched speech accepted")
	}
}

func TestReplyStopsWhenConsumerFailsAndCancellationReleasesDevice(t *testing.T) {
	c := mockDevice(t, func(ctx context.Context, conn *websocket.Conn) {
		exchangeHello(t, ctx, conn)
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"sentence_start","text":"守夜人。"}`))
		conn.Write(ctx, websocket.MessageBinary, []byte{1, 0})
		conn.Write(ctx, websocket.MessageText, []byte(`{"type":"tts","state":"stop"}`))
	})
	ctx, cancel := context.WithCancel(context.Background())
	_, err := c.Respond(ctx, session.DialogueRequest{PlayerText: "你是谁", OnSpeech: func(event session.SpeechEvent) error {
		cancel()
		return ctx.Err()
	}})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("cancellation lost: %v", err)
	}
	if c.DeviceStatus().LastError != "" {
		t.Fatal("interruption marked device as broken")
	}
	if _, err = c.Respond(context.Background(), session.DialogueRequest{PlayerText: "你是谁"}); err != nil {
		t.Fatalf("next turn could not acquire cancelled device: %v", err)
	}
}
