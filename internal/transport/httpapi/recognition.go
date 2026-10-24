package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/gin-gonic/gin"
	"nightwatch/internal/session"
)

func (h handler) recognize(c *gin.Context) {
	id := c.Param("id")
	if _, err := h.sessions.Snapshot(id); err != nil {
		writeError(c, err)
		return
	}
	service, ok := h.sessions.(interface {
		Recognize(context.Context, string, string, session.AudioSource, func() error) (string, error)
	})
	if !ok {
		c.JSON(503, gin.H{"error": session.ErrRecognition.Error()})
		return
	}
	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{OriginPatterns: []string{"localhost:*", "127.0.0.1:*"}})
	if err != nil {
		return
	}
	defer conn.CloseNow()
	conn.SetReadLimit(2048)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 45*time.Second)
	defer cancel()
	startCtx, startCancel := context.WithTimeout(ctx, 3*time.Second)
	var start struct {
		Type  string `json:"type"`
		RunID string `json:"runId"`
	}
	err = wsjson.Read(startCtx, conn, &start)
	startCancel()
	if err != nil || start.Type != "start" || start.RunID == "" || len(start.RunID) > 128 {
		return
	}
	frames := make(chan []byte, 64)
	// Keep reading after stop, so a closed browser cancels cloud STT immediately.
	go func() {
		defer cancel()
		stopped, total := false, 0
		for {
			kind, raw, err := conn.Read(ctx)
			if err != nil || stopped {
				return
			}
			if kind == websocket.MessageBinary {
				total += len(raw)
				if len(raw) != 640 || total > 16000*2*30 {
					return
				}
				select {
				case frames <- raw:
				case <-ctx.Done():
					return
				}
			} else {
				var message struct {
					Type string `json:"type"`
				}
				if json.Unmarshal(raw, &message) != nil || message.Type != "stop" {
					return
				}
				close(frames)
				stopped = true
			}
		}
	}()
	read := func(ctx context.Context) ([]byte, error) {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case frame, ok := <-frames:
			if !ok {
				return nil, io.EOF
			}
			return frame, nil
		}
	}
	text, err := service.Recognize(ctx, id, start.RunID, read, func() error { return wsjson.Write(ctx, conn, gin.H{"type": "ready"}) })
	if ctx.Err() != nil {
		return
	}
	if err != nil {
		message := session.ErrRecognition.Error()
		if errors.Is(err, session.ErrStaleRun) {
			message = "进度已经改变，请按住空格重新说。"
		}
		_ = wsjson.Write(ctx, conn, gin.H{"type": "error", "error": message})
		return
	}
	_ = wsjson.Write(ctx, conn, gin.H{"type": "transcript", "text": text})
}
